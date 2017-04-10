
var needUsers = [];
var user_link;
var user_id;
var group_link;
var group_id;
var secondOrderFriends = [];
var uniqFriends = [];
var nMutualFriends = [];
var userFriends = [];
var timeStamp;
var intervalIds;
var timeoutStack = [];
var isLogin = false;
var to = 500; // timeout. По хорошему его нужно автоматически вычислять в зависимости от кол-ва друзей у юзера
var counter = 0;
var report = "";


var vk = {
    data: {},
    appID: 5955203,
    appPermissions: 4260874,
    init: function() {
        (window.vkAsyncInit = function() {
            VK.init({
                apiId: vk.appID
            });
            VK.Auth.login(authInfo, vk.appPermissions);

            function authInfo(response) {
                //console.log(response);
                if (response.session) {
                    vk.data.user = response.session.user;
                    $("#user").val(vk.data.user.href);
                    $("#login").css({"display":"none"});
                    $("#logout").css({"display":"block"});
                    isLogin = true;

                    user_link = $("#user").val();
				    var re = /\/{0}\w*$/ig;
				    var screen_name = re.exec(user_link);
				    setUserId(screen_name[0]);
                } else alert("Не удалось войти!");
            }
        })();
    }
}

$(document).ready(vk.init());

$("#login").on("click", function(){
	vk.init();
})

$("#logout").on("click", function(){
	$("#stop-search").trigger("click");
	VK.Auth.logout(function(r){
		$("#login").css({"display":"block"});
		$("#logout").css({"display":"none"});
		isLogin = false;
	})
})


$("#find-mutual-friends-users").on("click", function() {
	if(!isLogin){
		$("#login").trigger("click");
		return false;
	}
	$("#foundedUsers").empty();
	getNumberOfMutualFriends();
    /*VK.Api.call('friends.get', {
        user_id: user_id
    }, function(r) {
        getNumberOfMutualFriends(r.response)
    });//*/
    $("#foundedUsers").append(`
		<div id="load" style="text-aligned: center;">
			<center>
				<img src="load.gif">
			<center>
		</div>`);
})

function getFriends(){
	VK.Api.call('friends.get', {
        user_id: user_id
    }, function(r) {
    	if(r.error == undefined){
    		userFriends = r.response;
    	}else{
    		console.log(r.error)
    	}
    });
}

$("#stop-search").on("click", function(){
	
	timeoutStack.forEach(function(item, i){
		clearTimeout(item);
	})
	timeoutStack = [];
	endProcess();

})

function deleteDuplicate(){
	var obj = {};
	for(var i = 0; i<secondOrderFriends.length; i++){
		var str = secondOrderFriends[i];
		obj[str] = true;
	}
	uniqFriends = Object.keys(obj);
	findMoreNMutual();
}

function getNumberOfMutualFriends() {
    var friendsBatch;
    var s = 25;
    var req, resp;
    var code;
    for (var i = 0; i < userFriends.length/s; i++) {
    	friendsBatch = userFriends.slice(s*i, s*(i+1));
    	req = friendsBatch.join(",");
    	code = `var friends = [`+req+`];
		var secondFriends;
		var j = 0;
		var response;
		while(j<friends.length){
			response = API.friends.get({user_id: friends[j], v: 5.8}).items;
			secondFriends = secondFriends + response;
			j=j+1;
		}
		return secondFriends;`
		setTimeout(addSecondsFriends, i*340, code);

    }
    setTimeout(deleteDuplicate, i*340);
    //setTimeout(findMoreNMutual, 300)
}

function addSecondsFriends(code){
	VK.Api.call('execute', {
    		code: code
    	}, function(r){
    		//console.log(r)
    		if(r.error == undefined){
    			var resp = [];
	    		resp = r.response;
	    		var arr = resp.split(',')
	    		secondOrderFriends = secondOrderFriends.concat(arr);
    		}//*/
    		
    	})
}

function findMoreNMutual() {
	var numberOfMutualFriends = $("#friends-number").val();
	var min = $("#friends-min").val();
	var max = $("#friends-max").val();
	var s = 25;
	var friendsBatch = [];
	var code, resp;
	for(var i = 0; i<=uniqFriends.length/s;i++){
		friendsBatch = uniqFriends.slice(s*i, s*(i+1));
		req = friendsBatch.join(",");
		code = `var friends = [`+req+`];
		var min = `+min+`;
		var max = `+max+`;
		var user = `+user_id+`;
		var response;
		var j = 0;
		var m;
		var result= [];
		while(j<friends.length){
			
			response = API.friends.getMutual({source_uid: user, target_uid: friends[j]});
			m = response.length;
			if(m>=min && m<=max){
				result.push(friends[j]);
			}
						
			j = j+1;
		}
		return result;`
		var timeoutId = setTimeout(foo, i*550, code);
		timeoutStack.push(timeoutId);
	}
	intervalId = setInterval(checkProcess, 500);
	//intervalIds.push(intervalId);
}

function checkProcess(){
	var now = (new Date()).getTime();
	if((now-timeStamp) > 2000){
		console.log(now-timeStamp)
	}
	if((now - timeStamp) > 5000){
		clearInterval(intervalId);
		endProcess();
	}
}

function endProcess(){
	secondOrderFriends = [];
	uniqFriends = [];
	nMutualFriends = [];
	userFriends = [];
	$("#load").remove();
	counter = 0;
	report = "";
}

var l = 0;

function foo(code){
	timeStamp = (new Date()).getTime();
	VK.Api.call('execute', {
			code: code
		}, function(r){
			console.log(r)
			if(r.error != undefined){
				if(r.error.error_code == 6){
					var code = r.error.request_params[3].value;
					//foo(code);
					setTimeout(foo, l*540, code);
					l++;
				}
			}else{
				var respArray = r.response;
				for(var i = 0; i<respArray.length; i++){
					if(respArray[i] == user_id) continue;
					if(userFriends.indexOf(respArray[i]) == -1){
						if(group_link){
							checkGroup(respArray[i]);
						}else{
							addFriend(respArray[i])
						}
					}
				}
			}
		})
}

function addFriend(friend){
	nMutualFriends.push(friend);
	VK.Api.call("users.get", {
		user_ids: friend,
		fields: "screen_name, photo_100"
	}, function(r){
		//console.log(r)
		if(r.response != undefined){
			var user = r.response[0];
			$("#load").before(`
				<a target="_blank" class="userlink" href="https://vk.com/`+user.screen_name+`">
					<div class="user">
						<img src="`+user.photo_100+`">
						<p>`+user.first_name+` `+user.last_name+`</p>
					
					</div>
				</a>`);
			$("#result").text(++counter)
			report+="https://vk.com/"+user.screen_name+"\n";
		}
		
	})
}

function checkGroup(user){
	VK.Api.call("groups.isMember", {
	    group_id: group_link,
	    user_id: user
	}, function(r) {
	    if (r.response == 1) {
	        addFriend(user)
	    }
	})
}

function getSecondOrderFriends(friend_id) { //deprecated
    VK.Api.call('friends.get', {
        user_id: friend_id
    }, function(r){
    	secondOrderFriends = secondOrderFriends.concat(r.response)
    })//*/
}


$("#user").on("input", function() {
    user_link = $("#user").val();
    var re = /\/{0}\w*$/ig;
    var screen_name = re.exec(user_link);
    setUserId(screen_name[0]);
})

$("#group-link").on("input", function(){
	group_link = $("#group-link").val();
	var re = /\/{0}\w*$/ig;
	var group = re.exec(group_link);
	group_link = group[0];
})


function setUserId(screen_name) {
    VK.Api.call('users.get', {
        user_ids: screen_name
    }, function(r) {
        user_id = r.response[0].uid;
        getFriends();
    })
}


$("#user").trigger("input")


$("#save-search").on("click", function(){
	var text = 'data:text/plain;charset=utf-8, ' + encodeURIComponent(report);
	this.href = text;
	this.target = "_blank";
	this.download = 'mutual_friends.txt';
})