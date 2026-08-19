(function () {
    angular.module('ngt4edu.portal.mediacontent')
        .config(['$stateProvider', '$urlMatcherFactoryProvider', routs]);
    function routs($stateProvider, $urlMatcherFactoryProvider) {
        $urlMatcherFactoryProvider.strictMode(false);
        $stateProvider
            .state('VimeoContent', {
                url: '/VimeoContent/:id',
                views: {
                    "main": {
                        templateUrl: 'app/portal/mediacontent/vimeo.tpl.html?v=47',
                        controller: 'vimeoController'
                    }
                }
            })
            .state('vimeocontent', {
                url: '/vimeocontent/:id',
                views: {
                    "main": {
                        templateUrl: 'app/portal/mediacontent/vimeo.tpl.html?v=47',
                        controller: 'vimeoController'
                    }
                }
            })
            .state('YoutubeContent', {
                url: '/YoutubeContent/:id',
                views: {
                    "main": {
                        templateUrl: 'app/portal/mediacontent/youtube.tpl.html?v=47',
                        controller: 'youtubeController'
                    }
                },
            })

        ;
    };
})();


