angular.module('wavelo.stats.weeklyStats', ['wavelo.stats.bikesDataService'])
    .controller('weeklyStatsCtrl', function ($scope, $http, $interval, BikesData, BikesChart) {
        moment.locale('pl');
        $scope.dailyStats = [];

        $scope.chart = {};
        $scope.chart.options = BikesChart.setUpChart();

        $scope.tripsGraph = {};
        $scope.tripsGraph.layout = {
            name: 'cose',
            padding: 1,
            componentSpacing: 40,
        };

        $scope.tripsGraph.style = [
            {
                selector: 'node',
                style: {
                    'label': 'data(name)',
                    'width': 'data(r)',
                    'height': 'data(r)',
                    'background-color': 'blue'
                }
            },
            {
                selector: 'edge',
                style: {
                    'label': 'data(weight)',
                    'curve-style': 'bezier',
                    'target-arrow-shape': 'triangle',
                    'width': 'data(weight)'
                }
            }
        ];

        var firstWeek = 9;
        $scope.weeks = [];
        $scope.currentWeek = parseInt(moment().tz("Europe/Warsaw").format("W"));
        $scope.displayedWeek = $scope.currentWeek;
        $scope.today = parseInt(moment().tz("Europe/Warsaw").format("DDD"));


        for (week = firstWeek; week <= $scope.currentWeek; week++) {
            var monday = moment(week, 'W').tz("Europe/Warsaw").startOf("isoWeek").format("YYYY-MM-DD");
            var sunday = moment(week, 'W').tz("Europe/Warsaw").endOf("isoWeek").format("YYYY-MM-DD");
            var description = monday + " - " + sunday;

            $scope.weeks.push({
                description: description,
                value: week
            })
        }

        $scope.getDailyStats = function () {
            var monday = parseInt(moment($scope.displayedWeek, 'W').tz("Europe/Warsaw").startOf("isoWeek").format("DDD"));

            for (day in $scope.dailyStats) {
                if ($scope.dailyStats[day]) $scope.dailyStats[day].loading = true;
            }

            for (var i = 0; i < 7; i++) {
                BikesData.getDailyStatistics(monday + i)
                    .then((function (index, bike_data) {
                        if (!bike_data) {
                            $scope.dailyStats[index] = null;
                            return;
                        }

                        $scope.dailyStats[index] = {};
                        $scope.dailyStats[index].nameOfDay = moment(monday + index, "DDD").tz("Europe/Warsaw").format("dddd");
                        $scope.dailyStats[index].date = moment(monday + index, "DDD").tz("Europe/Warsaw").format("YYYY-MM-DD");
                        $scope.dailyStats[index].totalRentals = bike_data['total_rentals'];
                        $scope.dailyStats[index].totalReturns = bike_data['total_returns'];
                        $scope.dailyStats[index].loading = false;
                        $scope.dailyStats[index].weatherClass = "wi wi-" + bike_data['weather_icon'];
                        $scope.dailyStats[index].tempMin = bike_data['min_temp'];
                        $scope.dailyStats[index].tempMax = bike_data['max_temp'];

                    }).bind(null, i));
            }

        }

        $scope.updateData = function () {
            $scope.loading = true;
            $scope.chart.data = [];

            BikesData.getWeek($scope.displayedWeek)
                .then(function (bike_data) {

                    var chartData = BikesChart.prepareChartData(bike_data);

                    var ns = chartData.data.length;
                    var nd = chartData.data[0].values.length;
                    for (var s = 0; s < ns; s++)
                        nd = Math.min(nd, chartData.data[s].values.length);

                    var maxNoBikes = 0;
                    for (var d = 0; d < nd; d++) {
                        var y = 0;
                        for (var s = 0; s < ns; s++)
                            y += chartData.data[s].values[d].y;

                        maxNoBikes = Math.max(maxNoBikes, y);
                    }


                    $scope.chart.data = chartData['data'];
                    $scope.chart.options.chart.xAxis.tickValues = chartData['tickValues'];
                    $scope.chart.options.chart.yDomain1 = [0, Math.max(15, Math.floor(1.15 * maxNoBikes))];
                    $scope.loading = false;

                    if ($scope.currentWeek == $scope.displayedWeek) {
                        $scope.availableNow = chartData['availableNow'];
                        $scope.rentedNow = chartData['rentedNow'];
                        $scope.brokenNow = chartData['brokenNow'];
                    }

                });

            BikesData.getWeeklyTripStatistics($scope.displayedWeek)
                .then(function (tripData) {

                    $scope.hubsLoading = true;
                    $scope.tripsLoading = true;

                    var hubs = {};
                    var trips = [];

                    for (var day in tripData) {
                        if (tripData[day] === null)
                            continue;

                        var dhd = tripData[day]['hubs'];

                        for (var h in dhd) {
                            if (h in hubs) {
                                hubs[h]['rentals'] += dhd[h]['rentals'];
                                hubs[h]['returns'] += dhd[h]['returns'];
                            } else {
                                hubs[h] = Object.assign({}, dhd[h]);
                            }
                        }
                    }
                    
                    if (null in hubs) {
                        hubs[0] = hubs[null];
                        hubs[0]['name'] = '00 Poza stacją';
                        delete hubs[null];
                    }

                    for (h in hubs) {
                        var name = hubs[h]['name'];
                        name = name.substr(name.indexOf(" ") + 1);
                        hubs[h]['name'] = name;
                    }
 
                    $scope.hubs = [];

                    for (h in hubs)
                        $scope.hubs.push(hubs[h]);

                    $scope.hubs.sort(function (l, r) { return r['rentals'] + r['returns'] - l['rentals'] - l['returns']; });
                    $scope.popular_hubs = $scope.hubs.slice(0, 12);
                    $scope.obscure_hubs = $scope.hubs.slice(-12);

                    $scope.hubsLoading = false;

                    for (var day in tripData) {
                        if (tripData[day] === null)
                            continue;
                        
                        var dtd = tripData[day]['trips'];
                        for (var i = 0; i < dtd.length; ++i) {
                            var from = dtd[i]['from'];
                            if (from === null)
                                from = 0;
                            var to = dtd[i]['to'];
                            if (to === null)
                                to = 0;
                            var count = dtd[i]['count'];

                            var t = trips.find(function (e) { return e['from'] === from && e['to'] == to; });

                            if (t !== undefined)
                                t['count'] += count;
                            else
                                trips.push({from: from, to: to, count: count });
                        }
                    }

                    trips.sort(function (l, r) { return r['count'] - l['count']; });
                    
                    $scope.tripsGraph.elements = {};

                    for (var t = 0; t < Math.min(trips.length, 12); ++t) {
                        var trip = trips[t];
                        var from = trip['from'];
                        var to = trip['to'];
                        var count = trip['count']
                        $scope.tripsGraph.elements[from + '->' + to] = {
                            group: 'edges',
                            data: {
                                source: from,
                                target: to,
                                weight: count
                            }
                        };

                        if (!(from in $scope.tripsGraph.elements)) {
                            $scope.tripsGraph.elements[from] = {
                                group: 'nodes',
                                data: {
                                    name: hubs[from]['name'],
                                    r: Math.sqrt((hubs[from]['rentals'] + hubs[from]['returns']))
                                }
                            };
                        }
                        
                        if (!(to in $scope.tripsGraph.elements)) {
                            $scope.tripsGraph.elements[to] = {
                                group: 'nodes',
                                data: {
                                    name: hubs[to]['name'],
                                    r: Math.sqrt((hubs[to]['rentals'] + hubs[to]['returns']))
                                }
                            };
                        }
                    }

                    $scope.tripsLoading = false;
                });
            
        }

        $scope.changeWeek = function () {
            $scope.getDailyStats();
            $scope.updateData();
        }

        $scope.getDailyStats();
        $scope.updateData();
        $scope.intervalFunction = function () {
            $interval(function () {
                $scope.updateData();
            }, 10 * 60 * 1000)
        };

        $scope.intervalFunction();
    })
