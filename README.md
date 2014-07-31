Polymer debugging extension
=========

<b>How to run:</b>

- Clone the repository.
> git clone https://github.com/sachinhosmani/polymer-devtools-extension.git

- Navigate to cloned directory.
- Get dependencies with `bower` (Make sure `bower` is installed before this).

> bower install

- Get Closure compiler from <a href='http://code.google.com/p/closure-compiler/downloads/list'>here</a>.
- Unzip file and put `compiler.jar` in `~/closureCompiler`.
- Install [vulcanize](https://github.com/Polymer/vulcanize)

> npm install -g vulcanize
 
- Build the project.

> python build.py

- The extension was put into `build/`.
- Open Chrome and go to `chrome://extensions`.
- Check `developer mode`.
- Click `Load unpacked extension`.
- Browse `build/` select it, Chrome will install the extension
- Open a web page written with Polymer
- Open devtools and navigate to the `Polymer` pane

<b>Basic Usage:</b>

- You will see 2 sides in the `Polymer` pane.
- The left side has two views of the DOM tree you can switch between.
- One is the `Composed DOM view` and the other is the `Local DOM view`.
- An element is either `blue` or `brown`. Blue ones are Polymer elements while the rest are not.
- Polymer elements when hovered on, show a `View Source` button, which if you click will take you to the definition file of the Polymer element.
- Hovering over an element highlights it in the page.
- The DOM trees respond to DOM mutations and are hence up-to-date.
- `Composed DOM view` gives you the entire composed DOM tree.
- `Local DOM view` focuses more on a selected element and can show both light DOM and composed DOM separately.
- In either of the views, clicking the `+` button to the left of a Polymer element will take you to the `local DOM view` (if you're not already in it) and show you the shadow DOM contents of the element. In this view, the entire composed DOM tree is never exposed. It goes one level deep into the shadow DOM and shows the light DOM of each child at that level.
- Clicking the `-` button (when its shown) will zoom out of the shadow DOM and show just the light DOM of the element.
- For convenience, one may find an element in the devtools inspector and select it. It will automatically get selected in the Polymer pane's composed DOM tree.
- In the right hand side of the pane are 3 tabs.
- They get filled up in response to what is selected in the element trees.
- The `properties` tab shows the properties of the selected element. (These object-trees are shown slightly differently for Polymer elements)
- The `model` tab shows the model that is behind an element (if any).
- The `breakpoints` tab shows a list of methods of the selected element. Clicking on any will add a breakpoint to the first line of the method.
- All properties/methods in the right side are live. They are kept up-to-date via O.o().
- All properties can be modified by clicking on their values and entering new valuesand this change takes immediate effect in the page.
- Some properties have a `refresh` button next to them. These properties are implemented as accessors and hence can't be kept up-to-date via O.o(). One has to refresh it to fetch the latest value.

<b>Note:</b>
It needs Object.observe() to work which means only Chrome 36 and above.
