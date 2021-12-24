var owner = "0x000";
var exchangeDirection = 1; //1: BNB->token, 0: token->BNB
var initialLoad = true;
var BNBbalance = 0;
var tokenbalance = 0;
var token_price = 14286;
var from_value = 0;
var to_value = 0;
var error_flag = 0;

var whitelist = [];


const decimalOnly = /^\s*-?[0-9]\d*(\.\d{1,26})?\s*/;



$(document).ready(function() {
    console.log("initialize");

    initialLoad = false;

    init();
    buttonId = "#connect_wallet";
    $("#connect_wallet").on("click", connect_wallet);

    $("#toggle-btn").on("click", toggleExchangeDirection);
    $("#exchange-btn").on("click", exchange);
    $("#from-input").on("input", from_input_change);
    $("#to-input").on("input", to_input_change);

    $("#set-price-btn").on("click", set_price);
    $("#max-supply-btn").on("click", set_maxsupply);
    $("#white-insert-btn").on("click", whitelist_insert);
    $("#white-remove-btn").on("click", whitelist_remove);
});

function connect_wallet(){
    $("#from-input").val("");
    $("#to-input").val("");
    if (!selectedAccount){
        onConnect();
    }else{
        onDisconnect();
    }
}
async function refresh_view_data(){
    const bep20_contract = await get_bep20_contract();
    console.log("bep20_contract", bep20_contract);
    if(bep20_contract){
        // owner
        owner = await bep20_contract.methods.owner().call();
        if(owner == selectedAccount){
            console.log("you are owner", selectedAccount)
            $("#user-panel")[0].classList.add("display-off");
            $("#user-panel")[0].classList.remove("display-on");
            $("#admin-panel")[0].classList.add("display-on");
            $("#admin-panel")[0].classList.remove("display-off");
        }else {
            console.log("you are not owner", selectedAccount)
            $("#user-panel")[0].classList.add("display-on");
            $("#user-panel")[0].classList.remove("display-off");
            $("#admin-panel")[0].classList.add("display-off");
            $("#admin-panel")[0].classList.remove("display-on");
        }
        // token price
        token_price = await bep20_contract.methods.getBuyDexRate().call();
        $("#token-price").text(token_price);
        
        //max supply limit
        const maxsupplylimit = await bep20_contract.methods.getmaxUserSupplyLimit().call();
        $("#max-supply").text(BigNumberToPlain(maxsupplylimit));
        //whitelist
        whitelist = await bep20_contract.methods.get_whitelisted_user().call();
        console.log("whitelist", whitelist);
        $("#whitelist-content").empty();
        for(i=0; i<whitelist.length; i++){
            console.log("whitelist", whitelist[i]);
            if(whitelist[i] == "0x0000000000000000000000000000000000000000") break;
            $("#whitelist-content").append("<p>" + whitelist[i] + "</p>")
        }
        //total supply   
        const total_supply = await bep20_contract.methods.totalSupply().call();
        console.log("total_supply", total_supply);
        // available token
        const available =  await bep20_contract.methods.availableTokens().call();
        console.log("available", available);
        
        //user purchased
        const user_purchased = await bep20_contract.methods.getPurchasedAmountOfUser(selectedAccount).call();
        console.log("user_purchased", user_purchased);
        
        //bnb balance of user
        const bnb_balance = await bep20_contract.methods.getBNBBalanceOfUser( selectedAccount ).call();
        console.log("bnb_balance", bnb_balance);
        //token balance
        const token_balance = await bep20_contract.methods.balanceOf( selectedAccount ).call();
        console.log("token_balance", token_balance);

        if(exchangeDirection){
            $("#from-balance").text(bnb_balance / 10 ** 18);
            $("#to-balance").text(user_purchased / 10 ** 18);
            $("#from-label").text("BNB");
            $("#to-label").text("NPETZ");
        }else{
            $("#from-balance").text(user_purchased / 10 ** 18);
            $("#to-balance").text(bnb_balance / 10 ** 18);
            $("#from-label").text("NPETZ"); 
            $("#to-label").text("BNB");
        }
        $("#purchased-value").text(user_purchased / 10 ** 18);
        $("#available-value").text(BigNumberToPlain(available / 10 ** 18));
        
    }
}

async function toggleExchangeDirection() {
    $("#from-input").val("");
    $("#to-input").val("");
    const bep20_contract = await get_bep20_contract();
    if(bep20_contract){
        exchangeDirection = exchangeDirection ? 0 : 1;
        console.log("exchangeDirection", exchangeDirection);
        refresh_view_data();
    }
    
}

function from_input_change(){
    from_value = $("#from-input").val();
    // from_value = Number(from_value);
    console.log("decimalOnly.test(from_value)", decimalOnly.test(from_value));
    if (!decimalOnly.test(from_value)){
        console.log("please insert number");
        $("#to-input").val("");
        error_flag = 1;
    }else{
        if(exchangeDirection){
            to_value = from_value * token_price;
        }else {
            to_value = from_value / token_price;
        }

        if(typeof to_value == NaN){
            error_flag = 1;
            $("#to-input").val("");
        }else{
            $("#to-input").val(to_value);
            error_flag = 0;
            console.log("to_value", to_value)
        }
    }

}

function to_input_change(){
    to_value = $("#to-input").val();
    // to_value = Number(to_value);
    if (!decimalOnly.test(to_value)){
        console.log("please insert number");
        $("#from-input").val("");
        error_flag = 1;
    }else{
        if(exchangeDirection){
            from_value = to_value / token_price;
        }else {
            from_value = to_value * token_price;
        }

        if(to_value == "NaN"){
            error_flag = 1;
            $("#from-input").val("");
        }else{
            $("#from-input").val(from_value);
            error_flag = 0;
            console.log("from-input", from_value)
        }
    }
}

function exchange(){
    console.log("input", from_value, ":",  to_value)
    if(!error_flag){
        if(exchangeDirection){
            buyNPETZ(from_value);
        }else{
            sellNPETZ(from_value);
        }
        refresh_view_data();
    }else{
        toastr.error("there is an error!");
    }
}

function BigNumberToPlain(num) {
    var str = num.toString();
    var flag = str.indexOf('e+');
    var ret = '';
    if (flag < 0) {
      ret = str;
    } else {
      var str_arr = str.split('e+');
      var tmp_num1 = str_arr[0];
      var tmp_num2 = str_arr[1];
      var dot_arr = tmp_num1.split('.');
      var dot_length = dot_arr.length < 2 ? 0 : dot_arr[1].length;
      var zero_count = tmp_num2 - dot_length;
      var tmp_num =
        dot_arr.length > 1 ? dot_arr[0] + '' + dot_arr[1] : dot_arr[0];
      for (var i = 0; i < zero_count; i++) {
        tmp_num += '0';
      }
      ret = tmp_num;
    }
    console.log(ret, ret.length);
    return ret;
}

// web3

async function set_price(){
    var _price =  $("#token-price-input").val();
    console.log("_price", _price);
    const bep20Contract = await get_bep20_contract();
    await bep20Contract.methods
        .setBuyDexRate(_price)
        .send({ from: selectedAccount})
        .on('receipt', function(receipt ){
            console.log("The price successfully changed!")
            toastr.success("The price successfully changed!");
            refresh_view_data();
        })
        .on('error', function(err){
          toastr.error("failed");
        });
    
}

async function set_maxsupply(){
    var _maxlimit =  $("#max-supply-input").val();
    console.log("_maxlimit", _maxlimit);
    const bep20Contract = await get_bep20_contract();
    await bep20Contract.methods
        .setmaxUserSupplyLimit(_maxlimit)
        .send({ from: selectedAccount})
        .on('receipt', function(receipt){
          toastr.success("The Supply limit successfully changed!");
        })
        .on('error', function(err){
          toastr.error("failed");
        });
    refresh_view_data();
}
async function whitelist_insert(){
    var _address =  $("#white-insert").val();
    console.log("_address", _address);
    const bep20Contract = await get_bep20_contract();
    await bep20Contract.methods
        .owner_whitelistInsert(_address)
        .send({ from: selectedAccount})
        .on('receipt', function(receipt ){
          toastr.success("successfully whitelisted!");
        })
        .on('error', function(err){
          toastr.error("failed");
        });
    refresh_view_data();
}

async function whitelist_remove(){
    var _address =  $("#white-remove").val();
    console.log("_address", _address);
    const bep20Contract = await get_bep20_contract();
    await bep20Contract.methods
        .owner_whitelistRemove(_address)
        .send({ from: selectedAccount})
        .on('receipt', function(receipt ){
          toastr.success("successfully blacklisted!");
        })
        .on('error', function(err){
          toastr.error("failed");
        });
    refresh_view_data();
}
