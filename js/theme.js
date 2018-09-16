$(document).ready( function() {


/* Add support of border radius and box shadow to IE using PIE.js */
Modernizr.load({
	test: Modernizr.borderradius && Modernizr.boxshadow,
	nope: "js/PIE.js",
	complete: function(){
		if(window.PIE){
			$('.pie').each( function(){
				window.PIE.attach(this);
			});			
       	}
    }
});




     
			    
						 
/* responsive menu - Flaunt.js v1.0.0 - Copyright 2013 Todd Motto - https://github.com/toddmotto/flaunt-js */	

$('#hmenu').append($('<div id="hmenu-mobile"></div>'));

$('#hmenu ul li').has('ul').prepend('<span class="nav-click"><i class="nav-arrow"></i></span>');

$('#hmenu-mobile').click( function(){
	$('#hmenu>ul').toggle();
});

$('#hmenu>ul').on('click', '.nav-click', function(){

	// Toggle the nested nav
	$(this).siblings('ul').toggle();
	
	// Toggle the arrow using CSS3 transforms
	$(this).children('.nav-arrow').toggleClass('nav-rotate');
	
});
 	
  			 
   
   
   			  
    
   
   
   
 
  						  	
 
 

  
			   
			 
	setEqualHeight ( $('section.home .col header') );
	setEqualHeight ( $('section.home .col p') );




});