angular.module('myApp', [
    'nvd3',
    'ngCytoscape',
    'ngMaterial',
    'ngMessages',
    'wavelo.stats.bikesDataService',
    'wavelo.stats.home',
    'wavelo.stats.weeklyStats',
    'wavelo.stats.currentState',
    'ui.router'
])
    .config(function ($mdThemingProvider, $stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('/');

        $stateProvider
            .state('home', {
                url: '/',
                templateUrl: 'js/templates/home.html',
                controller: 'homeCtrl',
            })
            .state('weeklyStats', {
                url: '/weeklyStats',
                templateUrl: 'js/templates/weeklyStats.html',
                controller: 'weeklyStatsCtrl',
            })
            .state('currentState', {
                url: '/current',
                templateUrl: 'js/templates/currentState.html',
                controller: 'currentStateCtrl',
            })

        $mdThemingProvider.theme('default')
            .primaryPalette('blue-grey')
            .accentPalette('blue');
    });
