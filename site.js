/* benjaminroos.de — interactions */
(function(){
  // Scroll reveal
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('show'); io.unobserve(e.target); }
    });
  }, { threshold:.12 });
  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

  // Mobile menu
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.querySelector('header.site nav');
  if(toggle && nav){
    toggle.addEventListener('click', function(){ nav.classList.toggle('open'); });
    nav.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ nav.classList.remove('open'); });
    });
  }

  // Contact form -> mailto fallback (no backend on GitHub Pages)
  var form = document.querySelector('form.anfrage');
  if(form){
    form.addEventListener('submit', function(ev){
      ev.preventDefault();
      var name = (form.querySelector('[name=name]')||{}).value || '';
      var email = (form.querySelector('[name=email]')||{}).value || '';
      var topic = (form.querySelector('[name=topic]')||{}).value || '';
      var msg = (form.querySelector('[name=message]')||{}).value || '';
      var subject = encodeURIComponent('Anfrage über benjaminroos.de: ' + topic);
      var body = encodeURIComponent(
        'Name: ' + name + '\nE-Mail: ' + email + '\nThema: ' + topic + '\n\n' + msg
      );
      window.location.href = 'mailto:mail@benjaminroos.de?subject=' + subject + '&body=' + body;
    });
  }
})();
