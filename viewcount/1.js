function counter(){
document.write('<a href="https://www.freevisitorcounters.com/en/home/stats/id/579171" target="_blank"><br><img src="https://www.freevisitorcounters.com/ctrimg/counter-id-579171.png" border="0" class="counterimg"></a>');}
}
counter()
function trimTrailingSlash(string)
{
  if(string != null) {
    return string.replace(/\/+$/, '');
  } else {
    return string;
  }
}
if (!String.prototype.trim) {
  String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g, '');
  };
}
ctrHref = trimTrailingSlash('https://www.symptoma.es/'.trim());
ctrHref2 = trimTrailingSlash('https://www.symptoma.es/'.trim());
eInDoc = function(e) {
  while (e=e.parentNode) {
   if (e==document) {
      return true;
    }
   }
   return false;
};
lCheck = function(l) {
  if (null != l && null != l.getAttribute('href') && (ctrHref === '' || trimTrailingSlash(l.getAttribute('href').trim()) == ctrHref || trimTrailingSlash(l.href.trim()) == ctrHref || trimTrailingSlash(l.getAttribute('href').trim()) == ctrHref2 || trimTrailingSlash(l.href.trim()) == ctrHref2)) {
    return true;
  }
  else {
    return false;
  }
};
linkfound = false;
window.onload = function () {
    els = document.getElementsByTagName('a');
    l = els.length;
    for (i = 0; i < l; i++) {
       el = els[i];
       if (trimTrailingSlash(el.href) === ctrHref || trimTrailingSlash(el.getAttribute('href')) === ctrHref || trimTrailingSlash(el.href) === ctrHref2 || trimTrailingSlash(el.getAttribute('href')) === ctrHref2) {
        linkfound = true;
        if(el.getAttribute('rel')=='nofollow' || !eInDoc(el) || !lCheck(el)) {
          linkfound = false;
        }
        linktext = el.innerHTML;
        if(linktext == undefined) {
          linkfound = false;
        }
        else if(linktext.trim() == '') {
          linkfound = false;
        }
        if(el.offsetHeight != undefined && el.offsetHeight < 8) {
          linkfound = false;
        }

        break;
      }
    }

    if(linkfound) {
  linkToHide = el;
  linkToHide.innerHTML = '';
}

    if (linkfound == false) {

            var div = document.createElement('div');
            div.id = 'error_';
            div.innerHTML = '<a href="http://www.freevisitorcounters.com/en/home/countercode/hashid/?id=c4a4f4e8d0cb58d6206462e2f4d988276794e0c6">Counter Error: Do not change the code. Click here to show the correct code!</a>';

 if(document.getElementById('counterimg') != null) { document.getElementById('counterimg').parentNode.insertBefore(div, document.getElementById('counterimg').nextSibling); } else { document.body.appendChild(div); }

      widget = document.getElementById('counterimg');
      if(widget) {
        widget.style.visibility = 'hidden';
      }
    }
}
