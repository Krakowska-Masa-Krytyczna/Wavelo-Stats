angular.module('wavelo.stats.bikesDataService', ['angularMoment'])
    .factory('BikesData', function ($http, $q) {
        var serverUrl = 'data';
        return {
            getSingleDay: function (dayOfYear) {

                datePart = moment(dayOfYear, 'DDD').tz("Europe/Warsaw").format("YYYY-MM-DD");
                url = serverUrl + '/split_data/wavelo_data_summary-' + datePart + '.yaml?timestamp=' + Date.now();
                return $http({
                    method: 'GET',
                    url: url
                })
                    .then(function (data) {
                        if (!data)
                            return null;

                        return jsyaml.load(data['data']);

                    }, function (response) {
                        return null;
                    })

            },
            getWeek: function (weekNumber) {

                var deferred = $q.defer();
                promises = [];

                var monday = parseInt(moment(weekNumber, 'W').tz("Europe/Warsaw").startOf("isoWeek").format("DDD"));
                for (i = 0; i < 7; i++) {
                    promises.push(this.getSingleDay(monday + i));
                }

                return $q.all(promises)
                    .then(function (results) {
                        deferred.resolve(results);
                        var week_data = {};
                        for (day_data in results) {
                            week_data[monday + parseInt(day_data)] = results[day_data];
                        }
                        return week_data;
                    },
                    function (errors) {
                        deferred.reject(errors);
                    })
            },
            getDailyStatistics: function (dayOfYear) {
                var datePart = moment(dayOfYear, 'DDD').tz("Europe/Warsaw").format("YYYY-MM-DD");
                var url = serverUrl + '/split_data/wavelo_data-' + datePart + '_summary_short.yaml?timestamp=' + Date.now();
                return $http({
                    method: 'GET',
                    url: url
                })
                    .then(function (data) {
                        if (!data)
                            return null;
                        return jsyaml.load(data['data']);
                    }, function (response) {
                        return null;
                    })

            },
            getDailyTripStatistics: function (dayOfYear) {
                var datePart = moment(dayOfYear, 'DDD').tz("Europe/Warsaw").format("YYYY-MM-DD");
                var url = serverUrl + '/split_data/wavelo_data-' + datePart + '_summary_trips.yaml?timestamp=' + Date.now();
                return $http({
                    method: 'GET',
                    url: url
                })
                    .then(function (data) {
                        if (!data)
                            return null;
                        return jsyaml.load(data['data']);
                    }, function (response) {
                        return null;
                    })

            },
            getWeeklyTripStatistics: function (weekNumber) {

                var deferred = $q.defer();
                promises = [];

                var monday = parseInt(moment(weekNumber, 'W').tz("Europe/Warsaw").startOf("isoWeek").format("DDD"));
                for (i = 0; i < 7; i++) {
                    promises.push(this.getDailyTripStatistics(monday + i));
                }

                return $q.all(promises)
                    .then(function (results) {
                        deferred.resolve(results);
                        var week_data = {};
                        for (day_data in results) {
                            week_data[monday + parseInt(day_data)] = results[day_data];
                        }
                        return week_data;
                    },
                    function (errors) {
                        deferred.reject(errors);
                    })
            },
            getCurrentState: function(){
                url = serverUrl + '/wavelo_data_current.yaml?timestamp=' + Date.now();
                return $http({
                    method: 'GET',
                    url: url
                })
                    .then(function (data) {
                        if (!data)
                            return null;

                        return jsyaml.load(data['data']);

                    }, function (response) {
                        return null;
                    })

            },
            getNews: function() {
                url = serverUrl + '/news.yaml?timestamp=' + Date.now();
                return $http({
                    method: 'GET',
                    url: url
                })
                    .then(function (data) {
                        if (!data)
                            return null;

                        return jsyaml.load(data['data']);

                    }, function (response) {
                        return null;
                    })
            }
        }
    })
    .factory('BikesChart', function () {
        return {
            prepareChartData: function (week_data) {

                var allAvailableInHubsBikes = [];
                var borrowedBikes = [];
                var notInHubBikes = [];
                var outsideOfArea = [];
                var unavailableBikes = [];
                var brokenBikes = [];
                var tickValues = [];
                var allAvailableBikes = [];
                var availableNow = null;

                for (var day in week_data) {
                    var day_data = week_data[day];
                    var timestamp = parseFloat(moment(day + ' 00:00', 'DDD HH:mm').tz("Europe/Warsaw").format('X'));
                    tickValues.push(timestamp);
                    tickValues.push(timestamp + 12 * 60 * 60);

                    /* Days where there are no data: generate points on 00:00 and 23:00, ticks are not enough */
                    if (day_data == null) {
                        toAdd = [0, 23 * 60 * 60 + 50 * 60];
                        for (var dayPoint = 0; dayPoint < toAdd.length; dayPoint++) {

                            var point = {
                                x: timestamp + toAdd[dayPoint],
                                y: null
                            };

                            allAvailableInHubsBikes.push(point);
                            allAvailableBikes.push(point);
                            borrowedBikes.push(point);
                            unavailableBikes.push(point);
                            outsideOfArea.push(point);
                            notInHubBikes.push(point);
                            brokenBikes.push(point);

                        }
                        continue;
                    }

                    for (date in day_data) {

                        allAvailableInHubsBikes.push({
                            x: day_data[date]['timestamp'],
                            y: day_data[date]['all_available_bikes_hubs'] != null ? day_data[date]['all_available_bikes_hubs'] : day_data[date]['all_available_bikes']
                        });

                        allAvailableBikes.push({
                            x: day_data[date]['timestamp'],
                            y: day_data[date]['all_available_bikes']
                        });

                        borrowedBikes.push({
                            x: day_data[date]['timestamp'],
                            y: day_data[date]['all_rented_bikes'] != null ? day_data[date]['all_rented_bikes'] : 300 - day_data[date]['all_available_bikes']
                        });

                        brokenBikes.push({
                            x: day_data[date]['timestamp'],
                            y: day_data[date]['all_repair_state_not_working'] != null ? day_data[date]['all_repair_state_not_working'] : null
                        });

                        unavailableBikes.push({
                            x: day_data[date]['timestamp'],
                            y: day_data[date]['all_unavailable_bikes'] != null ? day_data[date]['all_unavailable_bikes'] : null
                        });

                        var bikesOutside = day_data[date]['all_outside_area'] != null ? day_data[date]['all_outside_area'] : 0;
                        outsideOfArea.push({
                            x: day_data[date]['timestamp'],
                            y: bikesOutside
                        });

                        notInHubBikes.push({
                            x: day_data[date]['timestamp'],
                            y: day_data[date]['all_not_in_hub'] != null ? day_data[date]['all_not_in_hub'] - bikesOutside : 0
                        });
                    }

                    var today = parseInt(moment().tz("Europe/Warsaw").format("DDD"));

                    if (today == day) {
                        keys = Object.keys(day_data);
                        last_key = keys[keys.length - 1];

                        availableNow = day_data[last_key]['all_available_bikes'];
                        rentedNow = day_data[last_key]['all_rented_bikes'] != null ? day_data[last_key]['all_rented_bikes'] : 300 - day_data[last_key]['all_available_bikes']
                        brokenNow = day_data[last_key]['all_repair_state_not_working'] != null ? day_data[last_key]['all_repair_state_not_working'] : null;

                        /* Add 23:50 for current day, so if it's the last one in the week, the weeks ends still on 23:50 */
                        var point = {
                            x: parseFloat(moment(today + ' 23:50', 'DDD HH:mm').tz("Europe/Warsaw").format('X')),
                            y: null
                        };

                        allAvailableInHubsBikes.push(point);
                        allAvailableBikes.push(point);
                        borrowedBikes.push(point);
                        unavailableBikes.push(point);
                        outsideOfArea.push(point);
                        notInHubBikes.push(point);
                        brokenBikes.push(point);
                    }
                }

                var data = [
                    {
                        values: borrowedBikes,      //values - represents the array of {x,y} data points
                        key: 'rowery wypożyczone', //key  - the name of the series.
                        color: '#ff7f0e',  //color - optional: choose your own line color.
                        type: "area",
                        yAxis: 1
                    },

                    // {
                    //     values: allAvailableBikes,      //values - represents the array of {x,y} data points
                    //     key: 'wszystkie dostępne rowery', //key  - the name of the series.
                    //     color: '#337099',  //color - optional: choose your own line color.
                    //     type: "line",
                    //     yAxis: 1
                    // },
                    {
                        values: allAvailableInHubsBikes,      //values - represents the array of {x,y} data points
                        key: 'dostępne na stacjach', //key  - the name of the series.
                        color: '#b3d1e6',  //color - optional: choose your own line color.
                        type: "area",
                        yAxis: 1
                    },
                    {
                        values: notInHubBikes,      //values - represents the array of {x,y} data points
                        key: 'poza stacjami, w obszarze systemu', //key  - the name of the series.
                        color: '#62a0ca',  //color - optional: choose your own line color.
                        type: "area",
                        yAxis: 1
                    },

                    {
                        values: outsideOfArea,      //values - represents the array of {x,y} data points
                        key: 'poza obszarem systemu', //key  - the name of the series.
                        color: '#19384d',  //color - optional: choose your own line color.
                        type: "area",
                        yAxis: 1
                    },

                    {
                        values: brokenBikes,      //values - represents the array of {x,y} data points
                        key: 'uszkodzone', //key  - the name of the series.
                        color: '#b20c0e',  //color - optional: choose your own line color.
                        type: "area",
                        yAxis: 1
                    },

                    {
                        values: unavailableBikes,      //values - represents the array of {x,y} data points
                        key: 'niedostępne', //key  - the name of the series.
                        color: 'grey',  //color - optional: choose your own line color.
                        type: "area",
                        yAxis: 1
                    }
                ];

                return {
                    data: data,
                    tickValues: tickValues,
                    availableNow: availableNow,
                    rentedNow: rentedNow,
                    brokenNow: brokenNow
                }
            },
            drawChart: function (chartData) {

                return;
            },
            setUpChart: function () {
                var options = {
                    chart: {
                        type: 'multiChart',
                        height: 450,
                        margin: {
                            top: 20,
                            right: 20,
                            bottom: 40,
                            left: 55
                        },
                        useInteractiveGuideline: true,
                        visible: true,
                        xAxis: {
                            axisLabel: 'Data',
                            tickFormat: function (d) {
                                var date = new Date(d * 1000);

                                hour = date.getHours();
                                minutes = date.getMinutes();

                                if (hour == 0 && minutes < 10)
                                    return moment(d, 'X').tz("Europe/Warsaw").format('YYYY-MM-DD');
                                if (hour == 12 && minutes < 10)
                                    return moment(d, 'X').tz("Europe/Warsaw").format('dddd');
                                
                                return moment(d, 'X').tz("Europe/Warsaw").format('HH:mm');
                            }

                        },
                        noData: "Pobieranie danych...",
                        yAxis1: {
                            axisLabel: 'Liczba rowerów',
                            axisLabelDistance: -5
                        },

                        // callback: function (chart, e) {
                        //     console.log("callback");
                        // },
                        yDomain1: [0, 350]

                    }
                };


                return options;
            }
        }
    })
