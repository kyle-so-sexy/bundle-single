'use strict';

var gametitles = require('./gametitle.model');
var gamerepoth = require('./gamerepoth.model');

var gamerepo_logic = {

    // create gametitle document, handle error || success response
    create : function(req,res){
        gametitles.create(parse_form_gametitles(req.body),function(err, doc){ 
            return err ? handleError(res,err) : res.json(201, { // handle err, else handle success
                gamerepoth : parse_form_gamerepoth(req.body), // return successful data from gamerepoth
                gametitles : parse_form_gametitles(req.body) // return successful data from gametitles
            });
        });
    },

    // insert gametitles document, handle error || success response
    insert : function(req,res){ 
        this.create(req,res);
    }
};

// create a game-repo entry
exports.create = function(req, res) {
    
    // if document by property gamename found, do not create, else create
    gamerepoth.findOne({ gamename: req.body.gamename }, function(err, found){
        
        // handle error
        if(err) return handleError(res,err);

        return found 
        // handle found
        ? handleError(res,{message: ' duplicate entry found'})
        // create gamerepoth document, handle error || create gamerepo document
        : gamerepoth.create(parse_form_gamerepoth(req.body), function(err,doc){
            return err ? handleError(res,err) : gamerepo_logic.create(req,res);
        });
    });
 };

// index get a list of game-repo documents
exports.index = function(req, res) { 
    gametitles.find({}, function(err, doc){
        return err ? handleError(res, err)
        : res.json(doc);
    });
 };

// show get an individual game-repo document
exports.show = function(req, res) {
  gametitles.findById(req.params.id, function (err, doc) {
    if(err) { return handleError(res, err); }
    if(!doc) { return res.send(404); }
    return res.json(doc);
  });
 };

// update (is add) gametitles collection, with additional gamekeys
exports.update = function(req, res) {

    // query object
    var query = {
        // user can only update 1 gamename at a time
        'gamename' : parse_form_gametitles(req.body)[0].gamename,
        // get gamekeys as $in condition
        'gamekey' : { $in : get_gamekeys_query(parse_form_gametitles(req.body)) }
    };

    gamerepoth.findOne({ gamename: query.gamename }, function(err, found){
        
        // handle error
        if(err) return handleError(res,err);

        // handle found
        if(!found) return handleError(res,{message: ' could not update'});
        
        // insert gametitle document, handle error || create gamerepo document
        gametitles.find(query, function(err, found){

            // handle error
            if(err) return handleError(res,err);
            
            return found 
            // handle found
            ? handleError(res,{message: ' duplicate entry found, could not upate'})
            // create gamerepoth document, handle error || create gamerepo document
            : gamerepo_logic.insert(req,res);
        });
    });
 };

// destroy an individual game-repo document
exports.destroy = function(req,res){
  gametitles.findById(req.params.id, function (err, doc) {
    
    // handle error
    if(err) return handleError(res, err);
    
    // if document by _id found, remove, return error else 
    // attempt to remove document if error, return error, 
    // else, return success
    return !doc 
    ? res.send(404) 
    : doc.remove(function(err) { 
        return err ? handleError(res, err) : res.send(204);
    });
  });
 };

// has, accepts an array of gametitles, returns true || false
exports.has_by_json = function(req, res){

    var gamelist = parse_gametitles(req.body.gamelist);

    console.log(gamelist);

    gamerepoth.find({ gamename: { $in: gamelist } }, function(err, found){

        // handle error
        if(err) return handleError(res,err);
    
        // return result
        return found.length != gamelist.length
        // gamelist in gametitles not found
        ? handleError(res, {result : false, error : ""})
        // all gametitles in gamelist found
        : res.send(200, {result : true, error : ""});
    });
 };

function handleError(res, err) {
  return res.send(500, err);
 };

// accepts, form body, and return required args
function parse_form_gamerepoth(args){
    return { 
        threshold   : args.threshold,
        gamename    : args.gamename,
        totalcount  : tally_gametitles_entries(args)
    };
 }; 

// returns an array of entries
function parse_form_gametitles(args){

    // parse gamekeys as an array
    var gamekeys = parse_multiformat_gamekeys(args.gamekeys);

    // create an array of entries
    for(var i = 0, array_of_entries = []; i < gamekeys.length; i++){
        array_of_entries.push({ 
        	'gamename' 	: args.gamename, 
        	'gamekey' 	: gamekeys[i], 
        	'keystatus' : true
        });
    }

    return array_of_entries;
 };

// accepts parse_form_gametitles results, returns a gamekey query array
function get_gamekeys_query(array_of_entries){
    for(var i = 0, gamekey_query = []; i < array_of_entries.length; i++){
        gamekey_query.push(array_of_entries[i].gamekey);
    } return gamekey_query;
 }

// return totalcount of created entries
function tally_gametitles_entries(args){
    return parse_form_gametitles(args).length;
 }

// accepts, string or csv, returns an array of gamekeys
function parse_multiformat_gamekeys(data){
    
    // support unix/window compliance
    var gamekeys_array = data.replace( /\r\n/g, "," );
    gamekeys_array = gamekeys_array.replace( /\n/g, "," );
    gamekeys_array = gamekeys_array.replace( /\s/g, "," );
    gamekeys_array = gamekeys_array.split( "," );

    // check if last array is ""
    while(gamekeys_array[gamekeys_array.length - 1] == ""){
        gamekeys_array.pop();
    }

    return gamekeys_array;
 };

// accepts, string, returns an array of gametitles
function parse_gametitles(data){
    
    // support unix/window compliance
    var gametitle_array = data.replace( /\r\n/g, "," );
    gametitle_array = gametitle_array.replace( /\n/g, "," );
    gametitle_array = gametitle_array.replace( /,\s/g, "," );
    gametitle_array = gametitle_array.replace( /\s,/g, "," );
    gametitle_array = gametitle_array.split( "," );
    

    // check if last array is ""
    while(gametitle_array[gametitle_array.length - 1] == ""){
        gametitle_array.pop();
    }

    return gametitle_array;
 };