define(function (require) {

  var chrome = require('ui/chrome');

  return function KibiSelectHelperFactory(
    config, $http, courier, indexPatterns, timefilter, Private, Promise,
    savedDashboards, savedQueries, savedDatasources, kbnIndex
    ) {

    function KibiSelectHelper() {
    }

    var _ = require('lodash');
    var sparqlHelper = Private(require('ui/kibi/helpers/sparql_helper'));
    var sqlHelper = Private(require('ui/kibi/helpers/sql_helper'));
    var indexPath = Private(require('ui/kibi/components/commons/_index_path'));
    var datasourceHelper = Private(require('ui/kibi/helpers/datasource_helper'));

    var searchRequest = function (type) {
      return $http.get(chrome.getBasePath() + '/elasticsearch/' + kbnIndex + '/' + type + '/_search?size=100');
    };

    KibiSelectHelper.prototype.getQueries = function () {
      return searchRequest('query').then(function (queries) {
        if (queries.data.hits && queries.data.hits.hits) {
          var items = _.map(queries.data.hits.hits, function (hit) {
            return {
              group: hit._source.st_tags.length ? hit._source.st_tags.join() : 'No tag',
              label: hit._source.title,
              value: hit._id
            };
          });
          return items;
        }
      });
    };

    KibiSelectHelper.prototype.getDashboards = function () {
      return savedDashboards.find().then(function (data) {
        if (data.hits) {
          var items = _.map(data.hits, function (hit) {
            return {
              label: hit.title,
              value: hit.id
            };
          });
          return items;
        }
      });
    };

    KibiSelectHelper.prototype.getObjects = function (type) {
      return searchRequest(type).then(function (objects) {
        if (objects.data.hits && objects.data.hits.hits) {
          var items = _.map(objects.data.hits.hits, function (hit) {
            return {
              label: hit._source.title,
              value: hit._id
            };
          });
          return items;
        }
      });
    };

    KibiSelectHelper.prototype.getDatasources = function () {
      return savedDatasources.find().then(function (data) {
        if (data.hits) {
          var items = _.map(data.hits, function (hit) {
            return {
              label: hit.title,
              value: hit.id
            };
          });
          return items;
        }
      });
    };


    KibiSelectHelper.prototype.getDocumentIds = function (indexPatternId, indexPatternType) {
      if (!indexPatternId || !indexPatternType || indexPatternId === '' || indexPatternType === '') {
        return Promise.resolve([]);
      }

      return $http.get(
        chrome.getBasePath() + '/elasticsearch/' + indexPath(indexPatternId) + '/' + indexPatternType + '/_search?size=10'
      ).then(function (response) {
        var ids = [];
        _.each(response.data.hits.hits, function (hit) {
          ids.push({
            label: hit._id,
            value: hit._id
          });
        });

        return ids;
      });
    };


    KibiSelectHelper.prototype.getIndexTypes = function (indexPatternId) {
      if (!indexPatternId) {
        return Promise.resolve([]);
      }

      return $http.get(chrome.getBasePath() + '/elasticsearch/' + indexPath(indexPatternId) + '/_mappings')
      .then(function (response) {
        var types = [];


        for (var indexId in response.data) {
          if (response.data[indexId].mappings) {
            for (var type in response.data[indexId].mappings) {
              if (response.data[indexId].mappings.hasOwnProperty(type) && types.indexOf(type) === -1) {
                types.push(type);
              }
            }
          }
        }
        return _.map(types, function (type) {
          return {
            label: type,
            value: type
          };
        });
      });
    };

    KibiSelectHelper.prototype.getJoinRelations = function () {
      var relations = config.get('kibi:relations');

      if (!!relations && !!relations.relationsIndices) {
        var labels = _.map(relations.relationsIndices, function (relInd) {
          return {
            label: relInd.label,
            value: relInd.id
          };
        });
        return Promise.resolve(labels);
      }
    };

    KibiSelectHelper.prototype.getFields = function (indexPatternId, fieldTypes) {
      var defId;
      if (indexPatternId) {
        defId = indexPatternId;
      } else {
        defId = config.get('defaultIndex');
      }

      return indexPatterns.get(defId).then(function (index) {
        var fields = _.chain(index.fields)
        .filter(function (field) {
          // filter some fields
          if (fieldTypes instanceof Array && fieldTypes.length > 0) {
            return fieldTypes.indexOf(field.type) !== -1 && field.name && field.name.indexOf('_') !== 0;
          } else {
            return field.type !== 'boolean' && field.name && field.name.indexOf('_') !== 0;
          }
        }).sortBy(function (field) {
          return field.name;
        }).map(function (field) {
          return {
            label: field.name,
            value: field.name,
            options: {
              analyzed: field.analyzed
            }
          };
        }).value();
        return fields;
      });
    };

    KibiSelectHelper.prototype.getIndexesId = function () {
      return courier.indexPatterns.getIds().then(function (ids) {
        var fields = _.map(ids, function (id) {
          return {
            label: id,
            value: id
          };
        });
        return fields;
      });
    };

    KibiSelectHelper.prototype.getQueryVariables = function (queryId) {
      if (!queryId) {
        return Promise.reject(new Error('No queryId'));
      }
      // first fetch the query
      return new Promise(function (fulfill, reject) {
        savedQueries.get(queryId).then(function (savedQuery) {
          if (!savedQuery.st_datasourceId) {
            reject(new Error('SavedQuery [' + queryId + '] does not have st_datasourceId parameter'));
          }
          datasourceHelper.getDatasourceType(savedQuery.st_datasourceId).then(function (datasourceType) {
            var resultQuery = savedQuery.st_resultQuery;
            var variables = [];
            switch (datasourceType) {
              case 'sparql_http':
              case 'jdbc-sparql':
                variables = sparqlHelper.getVariables(resultQuery);
                break;
              case 'sqlite':
              case 'mysql':
              case 'pgsql':
              case 'jdbc':
                variables = sqlHelper.getVariables(resultQuery);
                break;
              case 'rest':
              case 'tinkerpop3':
                // do nothing if variables is empty a text box instead of select should be rendered
                break;
              default:
                return reject('Unknown datasource type for query=' + queryId + ': ' + datasourceType);
            }

            var fields = _.map(variables, function (v) {
              return {
                label: v.replace(',', ''),
                value: v.replace('?', '').replace(',', '') // in case of sparql we have to remove the '?'
              };
            });
            fulfill({
              fields: fields,
              datasourceType: datasourceType
            });
          })
          .catch(function (err) {
            reject(err);
          });
        })
        .catch(function (err) {
          reject(err);
        });
      });
    };

    KibiSelectHelper.prototype.getFontAwesomeIcon = function () {
      /*eslint max-len: [2, 180, 4]*/ // maximum length of 180 characters
      var icons = ['fa-500px','fa-adjust','fa-adn','fa-align-center','fa-align-justify','fa-align-left','fa-align-right',
                  'fa-amazon','fa-ambulance','fa-anchor','fa-android','fa-angellist','fa-angle-double-down','fa-angle-double-left',
                  'fa-angle-double-right','fa-angle-double-up','fa-angle-down','fa-angle-left','fa-angle-right','fa-angle-up','fa-apple',
                  'fa-archive','fa-area-chart','fa-arrow-circle-down','fa-arrow-circle-left','fa-arrow-circle-o-down','fa-arrow-circle-o-left','fa-arrow-circle-o-right',
                  'fa-arrow-circle-o-up','fa-arrow-circle-right','fa-arrow-circle-up','fa-arrow-down','fa-arrow-left','fa-arrow-right','fa-arrow-up',
                  'fa-arrows','fa-arrows-alt','fa-arrows-h','fa-arrows-v','fa-asterisk','fa-at','fa-backward',
                  'fa-balance-scale','fa-ban','fa-bar-chart','fa-barcode','fa-bars','fa-battery-empty','fa-battery-full',
                  'fa-battery-half','fa-battery-quarter','fa-battery-three-quarters','fa-bed','fa-beer','fa-behance','fa-behance-square',
                  'fa-bell','fa-bell-o','fa-bell-slash','fa-bell-slash-o','fa-bicycle','fa-binoculars','fa-birthday-cake',
                  'fa-bitbucket','fa-bitbucket-square','fa-black-tie','fa-bluetooth','fa-bluetooth-b','fa-bold','fa-bolt',
                  'fa-bomb','fa-book','fa-bookmark','fa-bookmark-o','fa-briefcase','fa-btc','fa-bug',
                  'fa-building','fa-building-o','fa-bullhorn','fa-bullseye','fa-bus','fa-buysellads','fa-calculator',
                  'fa-calendar','fa-calendar-check-o','fa-calendar-minus-o','fa-calendar-o','fa-calendar-plus-o','fa-calendar-times-o','fa-camera',
                  'fa-camera-retro','fa-car','fa-caret-down','fa-caret-left','fa-caret-right','fa-caret-square-o-down','fa-caret-square-o-left',
                  'fa-caret-square-o-right','fa-caret-square-o-up','fa-caret-up','fa-cart-arrow-down','fa-cart-plus','fa-cc','fa-cc-amex',
                  'fa-cc-diners-club','fa-cc-discover','fa-cc-jcb','fa-cc-mastercard','fa-cc-paypal','fa-cc-stripe','fa-cc-visa',
                  'fa-certificate','fa-chain-broken','fa-check','fa-check-circle','fa-check-circle-o','fa-check-square','fa-check-square-o',
                  'fa-chevron-circle-down','fa-chevron-circle-left','fa-chevron-circle-right','fa-chevron-circle-up','fa-chevron-down','fa-chevron-left','fa-chevron-right',
                  'fa-chevron-up','fa-child','fa-chrome','fa-circle','fa-circle-o','fa-circle-o-notch','fa-circle-thin',
                  'fa-clipboard','fa-clock-o','fa-clone','fa-cloud','fa-cloud-download','fa-cloud-upload','fa-code',
                  'fa-code-fork','fa-code:','fa-codepen','fa-codiepie','fa-coffee','fa-cog','fa-cogs',
                  'fa-columns','fa-comment','fa-comment-o','fa-commenting','fa-commenting-o','fa-comments','fa-comments-o',
                  'fa-compass','fa-compress','fa-connectdevelop','fa-contao','fa-copyright','fa-creative-commons','fa-credit-card',
                  'fa-credit-card-alt','fa-crop','fa-crosshairs','fa-css3','fa-cube','fa-cubes','fa-cutlery',
                  'fa-dashcube','fa-database','fa-delicious','fa-desktop','fa-deviantart','fa-diamond','fa-digg',
                  'fa-dot-circle-o','fa-download','fa-dribbble','fa-dropbox','fa-drupal','fa-edge','fa-eject',
                  'fa-ellipsis-h','fa-ellipsis-v','fa-empire','fa-envelope','fa-envelope-o','fa-envelope-square','fa-eraser',
                  'fa-eur','fa-exchange','fa-exclamation','fa-exclamation-circle','fa-exclamation-triangle','fa-expand','fa-expeditedssl',
                  'fa-external-link','fa-external-link-square','fa-eye','fa-eye-slash','fa-eyedropper','fa-facebook','fa-facebook-official',
                  'fa-facebook-square','fa-fast-backward','fa-fast-forward','fa-fax','fa-female','fa-fighter-jet','fa-file',
                  'fa-file-archive-o','fa-file-audio-o','fa-file-code-o','fa-file-excel-o','fa-file-image-o','fa-file-o','fa-file-pdf-o',
                  'fa-file-powerpoint-o','fa-file-text','fa-file-text-o','fa-file-video-o','fa-file-word-o','fa-files-o','fa-film',
                  'fa-fire','fa-fire-extinguisher','fa-firefox','fa-flag','fa-flag-checkered','fa-flag-o','fa-flask',
                  'fa-flickr','fa-floppy-o','fa-folder','fa-folder-o','fa-folder-open','fa-folder-open-o','fa-font',
                  'fa-fonticons','fa-fort-awesome','fa-forumbee','fa-forward','fa-foursquare','fa-frown-o','fa-futbol-o',
                  'fa-gamepad','fa-gavel','fa-gbp','fa-genderless','fa-get-pocket','fa-gg','fa-gg-circle',
                  'fa-gift','fa-git','fa-git-square','fa-github','fa-github-alt','fa-github-square','fa-glass',
                  'fa-globe','fa-google','fa-google-plus','fa-google-plus-square','fa-google-wallet','fa-graduation-cap','fa-gratipay',
                  'fa-h-square','fa-hacker-news','fa-hand-lizard-o','fa-hand-o-down','fa-hand-o-left','fa-hand-o-right','fa-hand-o-up',
                  'fa-hand-paper-o','fa-hand-peace-o','fa-hand-pointer-o','fa-hand-rock-o','fa-hand-scissors-o','fa-hand-spock-o','fa-hashtag',
                  'fa-hdd-o','fa-header','fa-headphones','fa-heart','fa-heart-o','fa-heartbeat','fa-history',
                  'fa-home','fa-hospital-o','fa-hourglass','fa-hourglass-end','fa-hourglass-half','fa-hourglass-o','fa-hourglass-start',
                  'fa-houzz','fa-html5','fa-i-cursor','fa-ils','fa-inbox','fa-indent','fa-industry',
                  'fa-info','fa-info-circle','fa-inr','fa-instagram','fa-internet-explorer','fa-ioxhost','fa-italic',
                  'fa-joomla','fa-jpy','fa-jsfiddle','fa-key','fa-keyboard-o','fa-krw','fa-label:',
                  'fa-label:','fa-language','fa-laptop','fa-lastfm','fa-lastfm-square','fa-leaf','fa-leanpub',
                  'fa-lemon-o','fa-level-down','fa-level-up','fa-life-ring','fa-lightbulb-o','fa-line-chart','fa-link',
                  'fa-linkedin','fa-linkedin-square','fa-linux','fa-list','fa-list-alt','fa-list-ol','fa-list-ul',
                  'fa-location-arrow','fa-lock','fa-long-arrow-down','fa-long-arrow-left','fa-long-arrow-right','fa-long-arrow-up','fa-magic',
                  'fa-magnet','fa-male','fa-map','fa-map-marker','fa-map-o','fa-map-pin','fa-map-signs',
                  'fa-mars','fa-mars-double','fa-mars-stroke','fa-mars-stroke-h','fa-mars-stroke-v','fa-maxcdn','fa-meanpath',
                  'fa-medium','fa-medkit','fa-meh-o','fa-mercury','fa-microphone','fa-microphone-slash','fa-minus',
                  'fa-minus-circle','fa-minus-square','fa-minus-square-o','fa-mixcloud','fa-mobile','fa-modx','fa-money',
                  'fa-moon-o','fa-motorcycle','fa-mouse-pointer','fa-music','fa-neuter','fa-newspaper-o','fa-object-group',
                  'fa-object-ungroup','fa-odnoklassniki','fa-odnoklassniki-square','fa-opencart','fa-openid','fa-opera','fa-optin-monster',
                  'fa-outdent','fa-pagelines','fa-paint-brush','fa-paper-plane','fa-paper-plane-o','fa-paperclip','fa-paragraph',
                  'fa-pause','fa-pause-circle','fa-pause-circle-o','fa-paw','fa-paypal','fa-pencil','fa-pencil-square',
                  'fa-pencil-square-o','fa-percent','fa-phone','fa-phone-square','fa-picture-o','fa-pie-chart','fa-pied-piper',
                  'fa-pied-piper-alt','fa-pinterest','fa-pinterest-p','fa-pinterest-square','fa-plane','fa-play','fa-play-circle',
                  'fa-play-circle-o','fa-plug','fa-plus','fa-plus-circle','fa-plus-square','fa-plus-square-o','fa-power-off',
                  'fa-print','fa-product-hunt','fa-puzzle-piece','fa-qq','fa-qrcode','fa-question','fa-question-circle',
                  'fa-quote-left','fa-quote-right','fa-random','fa-rebel','fa-recycle','fa-reddit','fa-reddit-alien',
                  'fa-reddit-square','fa-refresh','fa-registered','fa-renren','fa-repeat','fa-reply','fa-reply-all',
                  'fa-retweet','fa-road','fa-rocket','fa-rss','fa-rss-square','fa-rub','fa-safari',
                  'fa-scissors','fa-scribd','fa-search','fa-search-minus','fa-search-plus','fa-sellsy','fa-server',
                  'fa-share','fa-share-alt','fa-share-alt-square','fa-share-square','fa-share-square-o','fa-shield','fa-ship',
                  'fa-shirtsinbulk','fa-shopping-bag','fa-shopping-basket','fa-shopping-cart','fa-sign-in','fa-sign-out','fa-signal',
                  'fa-simplybuilt','fa-sitemap','fa-skyatlas','fa-skype','fa-slack','fa-sliders','fa-slideshare',
                  'fa-smile-o','fa-sort','fa-sort-alpha-asc','fa-sort-alpha-desc','fa-sort-amount-asc','fa-sort-amount-desc','fa-sort-asc',
                  'fa-sort-desc','fa-sort-numeric-asc','fa-sort-numeric-desc','fa-soundcloud','fa-space-shuttle','fa-spinner','fa-spoon',
                  'fa-spotify','fa-square','fa-square-o','fa-stack-exchange','fa-stack-overflow','fa-star','fa-star-half',
                  'fa-star-half-o','fa-star-o','fa-steam','fa-steam-square','fa-step-backward','fa-step-forward','fa-stethoscope',
                  'fa-sticky-note','fa-sticky-note-o','fa-stop','fa-stop-circle','fa-stop-circle-o','fa-street-view','fa-strikethrough',
                  'fa-stumbleupon','fa-stumbleupon-circle','fa-subscript','fa-subway','fa-suitcase','fa-sun-o','fa-superscript',
                  'fa-table','fa-tablet','fa-tachometer','fa-tag','fa-tags','fa-tasks','fa-taxi',
                  'fa-television','fa-tencent-weibo','fa-terminal','fa-text-height','fa-text-width','fa-th','fa-th-large',
                  'fa-th-list','fa-thumb-tack','fa-thumbs-down','fa-thumbs-o-down','fa-thumbs-o-up','fa-thumbs-up','fa-ticket',
                  'fa-times','fa-times-circle','fa-times-circle-o','fa-tint','fa-toggle-off','fa-toggle-on','fa-trademark',
                  'fa-train','fa-transgender','fa-transgender-alt','fa-trash','fa-trash-o','fa-tree','fa-trello',
                  'fa-tripadvisor','fa-trophy','fa-truck','fa-try','fa-tty','fa-tumblr','fa-tumblr-square',
                  'fa-twitch','fa-twitter','fa-twitter-square','fa-umbrella','fa-underline','fa-undo','fa-university',
                  'fa-unlock','fa-unlock-alt','fa-upload','fa-usb','fa-usd','fa-user','fa-user-md',
                  'fa-user-plus','fa-user-secret','fa-user-times','fa-users','fa-venus','fa-venus-double','fa-venus-mars',
                  'fa-viacoin','fa-video-camera','fa-vimeo','fa-vimeo-square','fa-vine','fa-vk','fa-volume-down',
                  'fa-volume-off','fa-volume-up','fa-weibo','fa-weixin','fa-whatsapp','fa-wheelchair','fa-wifi',
                  'fa-wikipedia-w','fa-windows','fa-wordpress','fa-wrench','fa-xing','fa-xing-square','fa-y-combinator',
                  'fa-yahoo','fa-yelp','fa-youtube','fa-youtube-play','fa-youtube-square'];

      var labels = _.map(icons, function (icon) {
        return {
          label: icon,
          value: icon
        };
      });
      return Promise.resolve(labels);
    };

    return new KibiSelectHelper();
  };
});
