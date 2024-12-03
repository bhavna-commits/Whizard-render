/* ============================================================
 * Form Wizard
 * Multistep form wizard using Bootstrap Wizard Plugin
 * For DEMO purposes only. Extract what you need.
 * ============================================================ */
(function($) {

    'use strict';

    $(document).ready(function() {

        $('#rootwizard').bootstrapWizard({
            onTabShow: function(tab, navigation, index) {
                var $total = navigation.find('li').length;
                
                var $current = index + 1;

                // If it's the last tab then hide the last button and show the finish instead
                if ($current >= $total) {
                    $('#rootwizard').find('.pager .next').hide();
                    $('#rootwizard').find('.pager .finish').show().removeClass('disabled hidden');
                } else {
                    $('#rootwizard').find('.pager .next').show();
                    $('#rootwizard').find('.pager .finish').hide();
                }

                var li = navigation.find('li a.active').parent();

                var btnNext = $('#rootwizard').find('.pager .next').find('button');
                var btnPrev = $('#rootwizard').find('.pager .previous').find('button');

                // remove fontAwesome icon classes
                function removeIcons(btn) {
                    btn.removeClass(function(index, css) {
                        return (css.match(/(^|\s)fa-\S+/g) || []).join(' ');
                    });
                }

                if ($current > 1 && $current < $total) {

                    var nextIcon = li.next().find('.fa');
                    var nextIconClass = nextIcon.attr('class').match(/fa-[\w-]*/).join();

                    removeIcons(btnNext);
                    btnNext.addClass(nextIconClass + ' btn-animated from-left fa');

                    var prevIcon = li.prev().find('.fa');
                    var prevIconClass = prevIcon.attr('class').match(/fa-[\w-]*/).join();

                    removeIcons(btnPrev);
                    btnPrev.addClass(prevIconClass + ' btn-animated from-left fa');
                } else if ($current == 1) {
                    // remove classes needed for button animations from previous button
                    btnPrev.removeClass('btn-animated from-left fa');
                    removeIcons(btnPrev);
                } else {
                    // remove classes needed for button animations from next button
                    btnNext.removeClass('btn-animated from-left fa');
                    removeIcons(btnNext);
                }
            },
            onNext: function(tab, navigation, index) {
                var cnt = parseInt($("#datatabId").attr('data-id'));
                
                var nextcnt  =  cnt+1;

                var livere =1;
                if(cnt==1){
                livere = livedata(cnt);
            }
            if(cnt==2){
                livere = livedatact(cnt);
            }
            if(cnt==3){

                livere = liveplatform(cnt);
            }
            if(cnt==4){

                livere = brandAdd(cnt);
            }
            if(cnt==5){

                livere = dondodiv(cnt);
            }
            if(cnt==6){


                livere = lavidatapost();
            }


            if(livere==2){
                return false;
            }
            $("#errormesseage").html("");
            if(nextcnt>=7){
                nextcnt =6;
            }
                $("#datatabId").attr('data-id',nextcnt);
                console.log("Showing next tab");
            },
            onPrevious: function(tab, navigation, index) {
                var cnt =parseInt($("#datatabId").attr('data-id'));

                if(cnt>1){
                    var nextcnt  =  parseInt(cnt)-1;
                }else{
                    var nextcnt  = cnt;
                }
                $("#datatabId").attr('data-id',nextcnt);
                console.log("Showing previous tab");
            },
            onInit: function() {
                $('#rootwizard ul').removeClass('nav-pills');
            }

        });

        $('.remove-item').click(function() {
            $(this).parents('tr').fadeOut(function() {
                $(this).remove();
            });
        });

    });

})(window.jQuery);

function livedata(cntv){
    
     var final = '';
   $('[id^=categoryslect]:checked').each(function() {
        var values = $(this).val();
        var comma = final.length===0?'':',';
        final += comma+values;
    }); 
   var rterror =1;
    if(final){
        
   localStorage.setItem('question',final);
   
 }else{
   
  $("#errormesseage").html("Select Any Category");
  var rterror =2;
  
 }
 return rterror;
}
function livedatact(cntv){
    
     var finaldata = $('#all-contry-list').attr("data-id");

  
   var rterror =1;
    if(finaldata){
       
        var htmltext = $('#c-list').html();
        localStorage.setItem('cntry_html',htmlentities.encode(htmltext));
        localStorage.setItem('cntry',finaldata);

        var finaldata1 = $('#all-state-list').attr("data-id");
        var htmltext1 = $('#c-list-state').html();
        localStorage.setItem('state_html',htmlentities.encode(htmltext1));
        localStorage.setItem('state',finaldata1);


        var finaldata2 = $('#all-city-list').attr("data-id");
        var htmltext2 = $('#c-list-city').html();
        localStorage.setItem('city_html',htmlentities.encode(htmltext2));
        localStorage.setItem('city',finaldata2);
    //localStorage.setItem('question',final);
   
 }else{
  
  $("#errormesseage").html("Select Any Country");
  var rterror =2;
  
 }
 return rterror;
}
function liveplatform(cntv){
    var insta = $('#insta').val();
        var fb = $('#fb').val();
        var yt = $('#yt').val();
        var twt = $('#twt').val();
        var lnk = $('#lnk').val();
        var ticktok = $('#ticktok').val();
        var snapchat = $('#snapchat').val();
        var blogger = $('#blogger').val();
        var rterror =1;

        if(insta=='' && fb=='' && yt=='' && twt=='' && lnk=='' && ticktok=='' && snapchat=='' && blogger==''){
            $("#errormesseage").html("Please Enter Any social Platform Price Per Post");
            var rterror =2;
        }
        return rterror;
}

function brandAdd(cntv){
    var cname = $('#cname').val();
        var cidea = $('#cidea').val();
        var ctag = $('#ctag').val();
        var gender = $('#gender').val();
         $('[id^=error_]').html('');
         var rterror =1;
         if(cname==''){
            $('#error_cname').html('Enter Brand Name');
            
            var rterror =2;
         }
         if(cidea==''){
            $('#error_cidea').html('Enter Campaign Idea');
            
            var rterror =2;
         }
         if(ctag==''){
            $('#error_ctag').html('Enter Campaign # Tag');
            
            var rterror =2;
         }
         if(gender==''){
            $('#error_gender').html('Enter Select Campaign Gender');
            
            var rterror =2;
         }
       
       
        return rterror;
}
function dondodiv(cntv){

     var inpt = parseFloat($("#min-value").val());
    var inptmax = parseFloat($("#max-value").val());
  
    var rterror =1;
    if(inptmax<inpt){
        $('#errormesseage').html("Maximun Followers Range Greater Then  Minimun Followers");
        $('#max-value').focus();
        var rterror =2;
            return rterror;
    }
    var x = $('input[name="mytextdo[]"]').val();
          if(x==''){
            $('#errormesseage').html("Please Enter Do's");
             $('input[name="mytextdo[]"]').focus();
            var rterror =2;
            return rterror;
          }
          var x = $('input[name="mytextdont[]"]').val();
          if(x==''){
            $('#errormesseage').html("Please Enter Don'ts");
            $('input[name="mytextdont[]"]').focus()
            var rterror =2;
            return rterror;
          }
          return rterror;
}
