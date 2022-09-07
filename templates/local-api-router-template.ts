const LOCAL_ROUTER_CONTENT = 
`/*
  url rule:
    1) /api/demo/notify-histories, method='get' --> /get/demo/notify-histories
    2) /api/demo/notify-histories/:id, method='put'  --> /put/demo/notify-histories/:id

  properties:
    1) name: unique name of this url data
    2) localData: any

  >> example:
    '/get/demo/notify-histories': {
      name: 'getDataSourceList',
      localData: { 
        success: true,
        data: {
          id: 1, 
          name: 'mock' 
        }
      }
    },
*/


export default {

}`;

export default LOCAL_ROUTER_CONTENT;
