'use strict';
(function (angular) {
    angular.module('ngt4edu.portal.mediacontent')
        .factory('mediacontentService', ['$resource', 'conf', 'lmsUrl', mediacontentService]);

    function mediacontentService($resource, conf, lmsUrl) {
        var service = {};
        service.Resource = $resource(lmsUrl + conf.treeUrl,
            { id: '@id' },
            {
                'GetMediaContentDetails': {
                    method: 'GET',
                    url: 'api/MediaContent/GetMediaContentDetails',
                    params: { videoId: '@videoId' }
                },
                'GetMediaContentDetailsById': {
                    method: 'GET',
                    url: 'api/MediaContent/GetMediaContentDetailsById',
                    params: { id: '@id' }
                },
                'GetMediaContentList': {
                    method: 'POST',
                    url: "api/MediaContent/GetMediaContents",                    
                    isArray: true
                },
                'GetPagedMediaContentList': {
                    method: 'POST',
                    url: "api/MediaContent/GetPagedMediaContents",
                    isArray: false
                },
                'GetPagedMediaContentsListStages': {
                    method: 'POST',
                  url: "api/MediaContent/GetPagedMediaContentsByStages",
                    isArray: false
                },
                'GetPagedMediaContentsByStagesCategories': {
                    method: 'POST',
                    url: "api/MediaContent/GetPagedMediaContentsByStagesCategories",
                    isArray: false
                },
                'GetMediaContentsBySpeciality': {
                    method: 'POST',
                    url: "api/MediaContent/GetMediaContentsBySpeciality",
                    isArray: false
                },
                'GetMediaContentsBySpecialityAndStage': {
                    method: 'POST',
                    url: "api/MediaContent/GetMediaContentsBySpecialityAndStage",
                    isArray: false
                },
                'LogMediaContent': {
                    method: 'GET',
                    url: 'api/MediaContent/LogMediaContent',
                    params: { id: '@mediaId' }
                }
            }
        );

        return service;
    };
})(angular);
