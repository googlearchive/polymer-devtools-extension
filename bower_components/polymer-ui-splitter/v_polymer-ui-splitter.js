

  // upgrade polymer-body last so that it can contain other imported elements
  document.addEventListener('polymer-ready', function() {

    Polymer('polymer-body', Platform.mixin({

      created: function() {
        this.template = document.createElement('template');
        var body = wrap(document).body;
        var c$ = body.childNodes.array();
        for (var i=0, c; (c=c$[i]); i++) {
          if (c.localName !== 'script') {
            this.template.content.appendChild(c);
          }
        }
        // snarf up user defined model
        window.model = this;
      },

      parseDeclaration: function(elementElement) {
        this.lightFromTemplate(this.template);
      }

    }, window.model));

  });

;

    Polymer('polymer-ui-splitter', {
      /**
       * Possible values are "left", "right", "up" and "down".
       *
       * @attribute direction
       * @type string
       * @default 'left'
       */
      direction: 'left',
      /**
       * Locks the split bar so it can't be dragged.
       *
       * @attribute locked
       * @type boolean
       * @default false
       */
      locked: false,
      ready: function() {
        this.directionChanged();
      },
      directionChanged: function() {
        this.isNext = this.direction === 'right' || this.direction === 'down';
        this.horizontal = this.direction === 'up' || this.direction === 'down';
        this.update();
      },
      update: function() {
        this.target = this.isNext ? this.nextElementSibling : this.previousElementSibling;
        this.dimension = this.horizontal ? 'height' : 'width';
        this.classList.toggle('horizontal', this.horizontal);
      },
      trackStart: function(e) {
        this.update();
        this.classList.add('active');
        this.size = parseInt(getComputedStyle(this.target)[this.dimension]);
      },
      track: function(e) {
        if (this.locked) {
          return;
        }
        var d = e[this.horizontal ? 'dy' : 'dx'];
        this.target.style[this.dimension] = 
            this.size + (this.isNext ? -d : d) + 'px';
      },
      trackEnd: function() {
        this.classList.remove('active');
      }
    });
  