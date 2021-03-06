
import expect from 'expect.js';

import {
  bdd,
  scenarioManager,
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('visualize app', function describeIndexTests() {
  const fromTime = '2015-09-19 06:31:44.000';
  const toTime = '2015-09-23 18:31:44.000';

  bdd.before(function () {
    PageObjects.common.debug('navigateToApp visualize');
    return PageObjects.common.navigateToUrl('visualize', 'new')
    .then(function () {
      PageObjects.common.debug('clickMetric');
      return PageObjects.visualize.clickMetric();
    })
    .then(function clickNewSearch() {
      return PageObjects.visualize.clickNewSearch();
    })
    .then(function setAbsoluteRange() {
      PageObjects.common.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      return PageObjects.header.setAbsoluteRange(fromTime, toTime);
    });
  });

  bdd.describe('metric chart', function indexPatternCreation() {

    bdd.it('should show Count', function () {
      const expectedCount = ['14,004', 'Count'];

      // initial metric of "Count" is selected by default
      return PageObjects.common.try(function tryingForTime() {
        return PageObjects.visualize.getMetric()
        .then(function (metricValue) {
          PageObjects.common.saveScreenshot('Visualize-metric-chart');
          expect(expectedCount).to.eql(metricValue.split('\n'));
        });
      });
    });

    bdd.it('should show Average', function () {
      const avgMachineRam = ['13,104,036,080.615', 'Average machine.ram'];
      return PageObjects.visualize.clickMetricEditor()
      .then(function () {
        PageObjects.common.debug('Aggregation = Average');
        return PageObjects.visualize.selectAggregation('Average');
      })
      .then(function selectField() {
        PageObjects.common.debug('Field = machine.ram');
        return PageObjects.visualize.selectField('machine.ram');
      })
      .then(function clickGo() {
        return PageObjects.visualize.clickGo();
      })
      .then(function () {
        return PageObjects.common.try(function tryingForTime() {
          return PageObjects.visualize.getMetric()
            .then(function (metricValue) {
              expect(avgMachineRam).to.eql(metricValue.split('\n'));
            });
        });
      });
    });

    bdd.it('should show Sum', function () {
      const sumPhpMemory = ['85,865,880', 'Sum of phpmemory'];
      PageObjects.common.debug('Aggregation = Sum');
      return PageObjects.visualize.selectAggregation('Sum')
      .then(function selectField() {
        PageObjects.common.debug('Field = phpmemory');
        return PageObjects.visualize.selectField('phpmemory');
      })
      .then(function clickGo() {
        return PageObjects.visualize.clickGo();
      })
      .then(function () {
        return PageObjects.common.try(function tryingForTime() {
          return PageObjects.visualize.getMetric()
            .then(function (metricValue) {
              expect(sumPhpMemory).to.eql(metricValue.split('\n'));
            });
        });
      });
    });

    bdd.it('should show Median', function () {
      const medianBytes = ['5,565.263', '50th percentile of bytes'];
      //  For now, only comparing the text label part of the metric
      PageObjects.common.debug('Aggregation = Median');
      return PageObjects.visualize.selectAggregation('Median')
      .then(function selectField() {
        PageObjects.common.debug('Field = bytes');
        return PageObjects.visualize.selectField('bytes');
      })
      .then(function clickGo() {
        return PageObjects.visualize.clickGo();
      })
      .then(function () {
        return PageObjects.common.try(function tryingForTime() {
          return PageObjects.visualize.getMetric()
            .then(function (metricValue) {
              // only comparing the text label!
              expect(medianBytes[1]).to.eql(metricValue.split('\n')[1]);
            });
        });
      });
    });

    bdd.it('should show Min', function () {
      const minTimestamp = ['September 20th 2015, 00:00:00.000', 'Min @timestamp'];
      PageObjects.common.debug('Aggregation = Min');
      return PageObjects.visualize.selectAggregation('Min')
      .then(function selectField() {
        PageObjects.common.debug('Field = @timestamp');
        return PageObjects.visualize.selectField('@timestamp');
      })
      .then(function clickGo() {
        return PageObjects.visualize.clickGo();
      })
      .then(function () {
        return PageObjects.common.try(function tryingForTime() {
          return PageObjects.visualize.getMetric()
            .then(function (metricValue) {
              expect(minTimestamp).to.eql(metricValue.split('\n'));
            });
        });
      });
    });

    bdd.it('should show Max', function () {
      const maxRelatedContentArticleModifiedTime = ['April 4th 2015, 00:54:41.000', 'Max relatedContent.article:modified_time'];
      PageObjects.common.debug('Aggregation = Max');
      return PageObjects.visualize.selectAggregation('Max')
      .then(function selectField() {
        PageObjects.common.debug('Field = relatedContent.article:modified_time');
        return PageObjects.visualize.selectField('relatedContent.article:modified_time');
      })
      .then(function clickGo() {
        return PageObjects.visualize.clickGo();
      })
      .then(function () {
        return PageObjects.common.try(function tryingForTime() {
          return PageObjects.visualize.getMetric()
            .then(function (metricValue) {
              expect(maxRelatedContentArticleModifiedTime).to.eql(metricValue.split('\n'));
            });
        });
      });
    });

    bdd.it('should show Standard Deviation', function () {
      const standardDeviationBytes = [
        '-1,435.138', 'Lower Standard Deviation of bytes',
        '12,889.766', 'Upper Standard Deviation of bytes'
      ];
      PageObjects.common.debug('Aggregation = Standard Deviation');
      return PageObjects.visualize.selectAggregation('Standard Deviation')
      .then(function selectField() {
        PageObjects.common.debug('Field = bytes');
        return PageObjects.visualize.selectField('bytes');
      })
      .then(function clickGo() {
        return PageObjects.visualize.clickGo();
      })
      .then(function () {
        return PageObjects.common.try(function tryingForTime() {
          return PageObjects.visualize.getMetric()
            .then(function (metricValue) {
              expect(standardDeviationBytes).to.eql(metricValue.split('\n'));
            });
        });
      });
    });

    bdd.it('should show Unique Count', function () {
      const uniqueCountClientip = ['1,000', 'Unique count of clientip'];
      PageObjects.common.debug('Aggregation = Unique Count');
      return PageObjects.visualize.selectAggregation('Unique Count')
      .then(function selectField() {
        PageObjects.common.debug('Field = clientip');
        return PageObjects.visualize.selectField('clientip');
      })
      .then(function clickGo() {
        return PageObjects.visualize.clickGo();
      })
      .then(function () {
        return PageObjects.common.try(function tryingForTime() {
          return PageObjects.visualize.getMetric()
            .then(function (metricValue) {
              expect(uniqueCountClientip).to.eql(metricValue.split('\n'));
            });
        });
      })
      .then(function () {
        return PageObjects.visualize.getMetric()
          .then(function (metricValue) {
            PageObjects.common.debug('metricValue=' + metricValue.split('\n'));
            expect(uniqueCountClientip).to.eql(metricValue.split('\n'));
          });
      });
    });

    bdd.it('should show Percentiles', function () {
      const percentileMachineRam = [
        '2,147,483,648', '1st percentile of machine.ram',
        '3,221,225,472', '5th percentile of machine.ram',
        '7,516,192,768', '25th percentile of machine.ram',
        '12,884,901,888', '50th percentile of machine.ram',
        '18,253,611,008', '75th percentile of machine.ram',
        '32,212,254,720', '95th percentile of machine.ram',
        '32,212,254,720', '99th percentile of machine.ram'
      ];

      PageObjects.common.debug('Aggregation = Percentiles');
      return PageObjects.visualize.selectAggregation('Percentiles')
      .then(function selectField() {
        PageObjects.common.debug('Field =  machine.ram');
        return PageObjects.visualize.selectField('machine.ram');
      })
      .then(function clickGo() {
        return PageObjects.visualize.clickGo();
      })
      .then(function () {
        return PageObjects.common.try(function tryingForTime() {
          return PageObjects.visualize.getMetric()
            .then(function (metricValue) {
              // kibi: changed expected value since the chart might be cut off
              const actualPercentileMachineRam = metricValue.split('\n');
              // check that there is one at least
              expect(actualPercentileMachineRam.length).to.be.ok();
              // check from the end, as the top might be cropped
              for (let i = actualPercentileMachineRam.length - 1, j = percentileMachineRam.length - 1; i >= 0; i--, j--) {
                expect(actualPercentileMachineRam[i]).to.be(percentileMachineRam[j]);
              }
              // kibi: end
            });
        });
      });
    });

    bdd.it('should show Percentile Ranks', function () {
      const percentileRankBytes = [ '2.036%', 'Percentile rank 99 of "memory"'];
      PageObjects.common.debug('Aggregation = Percentile Ranks');
      return PageObjects.visualize.selectAggregation('Percentile Ranks')
      .then(function selectField() {
        PageObjects.common.debug('Field =  bytes');
        return PageObjects.visualize.selectField('memory');
      })
      .then(function selectField() {
        PageObjects.common.debug('Values =  99');
        return PageObjects.visualize.setValue('99');
      })
      .then(function clickGo() {
        return PageObjects.visualize.clickGo();
      })
      .then(function () {
        return PageObjects.common.try(function tryingForTime() {
          return PageObjects.visualize.getMetric()
            .then(function (metricValue) {
              expect(percentileRankBytes).to.eql(metricValue.split('\n'));
            });
        });
      });
    });

  });
});
