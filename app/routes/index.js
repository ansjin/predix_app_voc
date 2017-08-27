const express                  = require('express');
const router                   = express.Router();
const request                   = require('request-promise');
var fs = require('fs')
    , split = require('split')
;
//===============ROUTES=================

const UAA_URL = process.env.uaaUrl || 'https://6a1e5ff3-ab32-45b4-bf67-4548a9c2efdb.predix-uaa.run.aws-usw02-pr.ice.predix.io/oauth/token';
const CLIENT_ID = process.env.clientId || 'timeseries_client_readonly';
const CLIENT_SECRET = 'secret';
const TS_ZONE_ID = process.env.zoneId ||'067e39c4-de83-40e2-b966-2f83ea5fc292';

var days_beteewn_fchange = 365;

const LONG_DAYS_PERIOD = 200;
const SHORT_DAYS_PERIOD=100;


function max(a,b)
{
    if(a>b) return a;
    else return b;
}
function min(a,b)
{
    if(a<b) return a;
    else return b;
}
router.get('/', function(req, res){
    res.send("inside router");
});
router.post('/getValues',function(req,res){

    var resetDate_l = (req.body.resetDate).getTime() / 1000;

    //var resetDate =  req.body.resetDate;
        request({
                    headers: {
                        'Content-Type': 'application/json',
                        'x-aio-key': "2880ecd4b0c447f8b2eb25c704490f61"
},
    uri: 'https://io.adafruit.com/api/v2/'+ req.body.username + '/feeds/' + req.body.feed_key+ '/data?start_time='+ req.body.start+ '&end_time=' + req.body.end,
        method: 'GET',
        json: true
}).then(data => {

    var date_voc_long = (Date.now() - LONG_DAYS_PERIOD * 86400000) / 1000;
    var date_voc_short = (Date.now() - SHORT_DAYS_PERIOD * 86400000)/1000;

    var date_reset = resetDate_l;

    var changeRequired = true;
    var numDays = 0;

    var total_voc_long = 0;

    var total_voc_short = 0;
    var total_voc_current = 0;
    var sum_voc_long_per_day = 0;
    var sum_voc_short_per_day = 0;
    var sum_voc_current_per_day = 0;
    var date_of_record = 0;
    var prevDay = 0;

    console.log(data.length);
    for(i=0;i<data.length;i++)
    {
        if(changeRequired==true) {
            prevDay = data[i].created_epoch - 86400;
            changeRequired = false;
            total_voc_long += sum_voc_long_per_day;
            total_voc_short += sum_voc_short_per_day;
            total_voc_current += sum_voc_current_per_day;
            numDays++;
            console.log("numDays" + numDays);
        }

        if( data[i].created_epoch > prevDay && data[i].created_epoch > date_voc_long ){
            sum_voc_long_per_day+=parseInt(data[i].value);
        }
        if( data[i].created_epoch > prevDay && data[i].created_epoch > date_voc_short ){
            sum_voc_short_per_day+=parseInt(data[i].value);
        }

        if( data[i].created_epoch > prevDay && data[i].created_epoch > date_reset ){
            sum_voc_current_per_day+=parseInt(data[i].value);
        }
        if(data[i].created_epoch <= prevDay)
        {
            changeRequired = true
        }
    }
    total_voc_long += sum_voc_long_per_day;
    total_voc_short += sum_voc_short_per_day;
    total_voc_current += sum_voc_current_per_day;

    var new_long_days = min(LONG_DAYS_PERIOD,numDays );
    var new_short_days = min(SHORT_DAYS_PERIOD, numDays);

    var average_voc_long = total_voc_long/new_long_days;
    var average_voc_short = total_voc_short/new_short_days;

    var max_voc = days_beteewn_fchange * average_voc_long;  // calculating the maximal VOC amount until filter has to be changed

    console.log("" + max_voc);

    var prediction = max(0, max_voc - total_voc_current) / average_voc_short;
    console.log("" + prediction);
    res.send("" + prediction);

}).catch(err => {
        console.log('Error:', err);
});
});

router.post('/getValuesFile',function(req,res) {

    var resetDate_l = (new Date(req.body.resetDate)).getTime() / 1000;

    var data = JSON.parse(fs.readFileSync("app/public/co1-20170825-1223.json", 'utf8'));

    var date_voc_long = (Date.now() - LONG_DAYS_PERIOD * 86400000) / 1000;
    var date_voc_short = (Date.now() - SHORT_DAYS_PERIOD * 86400000) / 1000;

    var date_reset = resetDate_l;
    //date_reset.setDate(resetDate);


    var changeRequired = true;
    var numDays = 0;

    var total_voc_long = 0;

    var total_voc_short = 0;
    var total_voc_current = 0;
    var sum_voc_long_per_day = 0;
    var sum_voc_short_per_day = 0;
    var sum_voc_current_per_day = 0;
    var date_of_record = 0;
    var nextDay = 0;

    var limit = 0;
    if(req.body.numpoints == -1)
        limit = data.length
    else
        limit = min(req.body.numpoints, data.length);

    for (i = 0; i < limit; i++) {

        if (changeRequired == true) {
            nextDay = (new Date(data[i].created_at).getTime() + 86400000) / 1000 ;
            changeRequired = false;
            total_voc_long += sum_voc_long_per_day;
            total_voc_short += sum_voc_short_per_day;
            total_voc_current += sum_voc_current_per_day;
            numDays++;
            console.log("numDays" + numDays);
            console.log("total_voc_long" + total_voc_long);


        }
        console.log("date_voc_long" + date_voc_long);


        currentTime = new Date(data[i].created_at).getTime() / 1000;
        console.log("currentTime" + currentTime);
        console.log("nextDay" + nextDay);
        console.log("date_voc_long" + date_voc_long);
        console.log("date_voc_short" + date_voc_short);
        console.log("date_reset" + date_reset);

        if (currentTime < nextDay && currentTime> date_voc_long) {
            sum_voc_long_per_day += parseInt(data[i].value);
        }
        if (currentTime < nextDay && currentTime > date_voc_short) {
            sum_voc_short_per_day += parseInt(data[i].value);
        }

        if (currentTime < nextDay && currentTime > date_reset) {
            sum_voc_current_per_day += parseInt(data[i].value);
        }
        if (currentTime >= nextDay) {
            changeRequired = true
        }
    }
    total_voc_long += sum_voc_long_per_day;
    total_voc_short += sum_voc_short_per_day;
    total_voc_current += sum_voc_current_per_day;
    console.log("numDays" + numDays);
    console.log("total_voc_long" + total_voc_long);
    console.log("total_voc_short" + total_voc_short);
    console.log("total_voc_current" + total_voc_current);

    var new_long_days = min(LONG_DAYS_PERIOD, numDays);
    var new_short_days = min(SHORT_DAYS_PERIOD, numDays);

    var average_voc_long = total_voc_long / new_long_days;
    var average_voc_short = total_voc_short / new_short_days;

    var max_voc = days_beteewn_fchange * average_voc_long;  // calculating the maximal VOC amount until filter has to be changed

    console.log("" + max_voc);

    var prediction = max(0, max_voc - total_voc_current) / average_voc_short;
    console.log("" + prediction);
    res.send("" + prediction);
});

module.exports = router;