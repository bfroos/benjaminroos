/* benjaminroos.de — interactions */
(function(){
  // ---- Web3Forms access key (routes submissions to mail@benjaminroos.de, address stays private) ----
  var WEB3FORMS_KEY = "REPLACE_WITH_WEB3FORMS_ACCESS_KEY";

  var EN = (document.documentElement.lang || "de").toLowerCase().indexOf("en") === 0;

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

  // Contact form -> Web3Forms (no e-mail address exposed on the page)
  var form = document.querySelector('form.anfrage');
  if(form){
    form.addEventListener('submit', function(ev){
      ev.preventDefault();
      var btn = form.querySelector('button[type=submit]');
      var configured = WEB3FORMS_KEY && WEB3FORMS_KEY.indexOf("REPLACE_") !== 0;

      if(!configured){
        alert(EN
          ? "The contact form is being set up. Meanwhile, please reach out via LinkedIn."
          : "Das Kontaktformular wird gerade eingerichtet. Bitte melde dich so lange kurz über LinkedIn.");
        return;
      }

      var data = new FormData(form);
      data.append('access_key', WEB3FORMS_KEY);
      data.append('subject', EN ? 'New enquiry via benjaminroos.de' : 'Neue Anfrage über benjaminroos.de');
      data.append('from_name', 'benjaminroos.de');

      if(btn){ btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.textContent = EN ? 'Sending …' : 'Wird gesendet …'; }

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: data
      })
      .then(function(r){ return r.json(); })
      .then(function(res){
        if(res && res.success){
          form.innerHTML = '<p style="font-family:var(--ff-display);font-weight:500;font-size:1.25rem;color:var(--fg)">' +
            (EN ? 'Thank you — your message is on its way. I usually reply within 48 hours.'
                : 'Danke — deine Nachricht ist unterwegs. Ich melde mich meist innerhalb von 48 Stunden.') + '</p>';
        } else {
          throw new Error('web3forms');
        }
      })
      .catch(function(){
        if(btn){ btn.disabled = false; btn.innerHTML = btn.dataset.label || (EN ? 'Send request' : 'Anfrage senden'); }
        alert(EN
          ? 'Something went wrong. Please try again later or reach out via LinkedIn.'
          : 'Es gab ein Problem. Bitte versuche es später erneut oder melde dich über LinkedIn.');
      });
    });
  }
})();
