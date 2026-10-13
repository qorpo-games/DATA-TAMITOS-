function handler(event) {
 var req=event.request,uri=req.uri.replace(/\/+$/,"")||"/";
 var map={"/":"/sk/spolu","/rodic-novacik":"/sk/spolu/rodic-novacik","/co-funguje":"/sk/spolu/co-funguje","/strava":"/sk/spolu/strava","/terapie":"/sk/spolu/terapie","/adresar":"/sk/spolu/adresar","/data":"/sk/spolu/data","/novinky":"/sk/spolu/novinky","/komunita":"/sk/spolu#diskusie"};
 var target=map[uri];if(!target&&/^\/novinky\/[^/]+$/.test(uri))target="/sk/spolu/novinky";
 if(target)return {statusCode:301,statusDescription:"Moved Permanently",headers:{location:{value:"https://tamitos.com"+target},"cache-control":{value:"public, max-age=300"}}};
 return req;
}