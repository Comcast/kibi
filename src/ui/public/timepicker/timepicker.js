import html from 'ui/timepicker/timepicker.html';
import _ from 'lodash';
import moment from 'moment';
import Notifier from 'kibie/notify/notifier';
import 'ui/timepicker/timepicker.less';
import 'ui/directives/input_datetime';
import 'ui/directives/inequality';
import 'ui/timepicker/quick_ranges';
import 'ui/timepicker/refresh_intervals';
import 'ui/timepicker/time_units';
import 'ui/timepicker/kbn_global_timepicker';
import uiModules from 'ui/modules';
const module = uiModules.get('ui/timepicker');
const notify = new Notifier({
  location: 'timepicker',
});

// kibi: imports
import { parse, parseWithPrecision } from 'ui/kibi/utils/date_math_precision';
// kibi: added to allow syncing time to other dashboards
import 'ui/kibi/directives/kibi_sync_time_to';
// kibi: end

module.directive('kbnTimepicker', function (quickRanges, timeUnits, refreshIntervals) {
  return {
    restrict: 'E',
    scope: {
      from: '=',
      to: '=',
      mode: '=',
      interval: '=',
      activeTab: '=',
      onFilterSelect: '&',
      onIntervalSelect: '&'
    },
    template: html,
    controller: function ($scope) {
      $scope.format = 'MMMM Do YYYY, HH:mm:ss.SSS';
      $scope.modes = ['quick', 'relative', 'absolute'];
      $scope.activeTab = $scope.activeTab || 'filter';

      if (_.isUndefined($scope.mode)) $scope.mode = 'quick';

      $scope.quickLists = _(quickRanges).groupBy('section').values().value();
      $scope.refreshLists = _(refreshIntervals).groupBy('section').values().value();

      $scope.relative = {
        count: 1,
        unit: 'm',
        preview: undefined,
        round: false
      };

      $scope.absolute = {
        from: moment(),
        to: moment()
      };

      $scope.units = timeUnits;

      $scope.relativeOptions = [
        { text: 'Seconds ago', value: 's' },
        { text: 'Minutes ago', value: 'm' },
        { text: 'Hours ago', value: 'h' },
        { text: 'Days ago', value: 'd' },
        { text: 'Weeks ago', value: 'w' },
        { text: 'Months ago', value: 'M' },
        { text: 'Years ago', value: 'y' },
      ];

      $scope.$watch('from', function (date) {
        if (moment.isMoment(date) && $scope.mode === 'absolute') {
          $scope.absolute.from = date;
        }
      });

      $scope.$watch('to', function (date) {
        if (moment.isMoment(date) && $scope.mode === 'absolute') {
          $scope.absolute.to = date;
        }
      });

      $scope.$watch('absolute.from', function (date) {
        if (_.isDate(date)) $scope.absolute.from = moment(date);
      });

      $scope.$watch('absolute.to', function (date) {
        if (_.isDate(date)) $scope.absolute.to = moment(date);
      });

      $scope.setMode = function (thisMode) {
        switch (thisMode) {
          case 'quick':
            break;
          case 'relative':
            const fromParts = $scope.from.toString().split('-');
            let relativeParts = [];

            // Try to parse the relative time, if we can't use moment duration to guestimate
            if ($scope.to.toString() === 'now' && fromParts[0] === 'now' && fromParts[1]) {
              relativeParts = fromParts[1].match(/([0-9]+)([smhdwMy]).*/);
            }
            if (relativeParts[1] && relativeParts[2]) {
              $scope.relative.count = parseInt(relativeParts[1], 10);
              $scope.relative.unit = relativeParts[2];
            } else {
              // kibi: add support for time precision
              const duration = moment.duration(moment().diff(parseWithPrecision($scope.from, false, $scope.kibiTimePrecision)));
              const units = _.pluck(_.clone($scope.relativeOptions).reverse(), 'value');
              if ($scope.from.toString().split('/')[1]) $scope.relative.round = true;
              for (let i = 0; i < units.length; i++) {
                const as = duration.as(units[i]);
                if (as > 1) {
                  $scope.relative.count = Math.round(as);
                  $scope.relative.unit = units[i];
                  break;
                }
              }
            }

            if ($scope.from.toString().split('/')[1]) $scope.relative.round = true;
            $scope.formatRelative();

            break;
          case 'absolute':
            // kibi: add support for time precision
            $scope.absolute.from = parseWithPrecision(
              $scope.from || moment().subtract('minutes', 15),
              false,
              $scope.kibiTimePrecision
            );
            $scope.absolute.to = parseWithPrecision($scope.to || moment(), true, $scope.kibiTimePrecision);
            break;
        }

        $scope.mode = thisMode;
      };

      $scope.setQuick = function (from, to) {
        $scope.from = from;
        $scope.to = to;
        // kibi: sync time to other dashboards
        if ($scope.syncTimeTo) {
          $scope.syncTimeTo();
        }
        // kibi: end
        $scope.onFilterSelect({ from, to });
      };

      $scope.setToNow = function () {
        $scope.absolute.to = moment();
      };

      $scope.formatRelative = function () {
        const parsed = parse(getRelativeString());

        // kibi: positive value check added for year
        const year = parsed ? parsed._d.getFullYear() : undefined;
        $scope.relative.preview =  parsed && year > 0  ? parsed.format($scope.format) : undefined;
        // kibi: end
        return parsed;
      };

      $scope.applyRelative = function () {
        $scope.onFilterSelect({
          from: getRelativeString(),
          to: 'now'
        });
      };

      function getRelativeString() {
        return 'now-' + $scope.relative.count + $scope.relative.unit + ($scope.relative.round ? '/' + $scope.relative.unit : '');
      }

      $scope.applyAbsolute = function () {
        $scope.onFilterSelect({
          from: moment($scope.absolute.from),
          to: moment($scope.absolute.to)
        });
      };

      $scope.setRefreshInterval = function (interval) {
        interval = _.clone(interval || {});
        notify.log('before: ' + interval.pause);
        interval.pause = (interval.pause == null || interval.pause === false) ? false : true;

        notify.log('after: ' + interval.pause);

        $scope.onIntervalSelect({ interval });
      };

      $scope.setMode($scope.mode);
    }
  };
});
