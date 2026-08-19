(function () {
    angular.module('ngt4edu.portal.generalactivities')
        .config(['$stateProvider', '$urlMatcherFactoryProvider', routs]);
    function routs($stateProvider, $urlMatcherFactoryProvider) {
        $urlMatcherFactoryProvider.strictMode(false);
        $stateProvider
            .state('studentactivitiesmainpage', {
                url: '/studentactivities',
                views: {
                    "main": {
                        templateUrl: 'app/portal/generalactivities/studentactivities.tpl.html?v=47',
                        controller: 'studentactivitiesCtrl'
                    }
                }
            })
            .state('generalactivitiesmainpage', {
                url: '/generalactivities/:categoryId',
                views: {
                    "main": {
                        templateUrl: 'app/portal/generalactivities/generalactivitiespage.tpl.html?v=47',
                        controller: 'generalactivitiespageCtrl'
                    }
                }
            })
            .state('generalactivitiespackages', {
                url: '/generalactivitiespackages/:categoryId',
                views: {
                    "main": {
                        templateUrl: 'app/portal/generalactivities/generalactivitiespackages.tpl.html?v=47',
                        controller: 'generalactivitiespackagesCtrl'
                    }
                }
            })
            ;
    };
})();

