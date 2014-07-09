Polymer devtools extension
=========

<b>How to run:</b>

- Clone the repository
> git clone https://github.com/sachinhosmani/sample-chrome-extension.git

- Navigate to cloned directory
- Install dependencies
> bower install

- Open Chrome and go to `chrome://extensions`
- Check `developer mode`
- Click `Load unpacked extension`
- Browse to the git directory and select it, Chrome will install the extension
- Open a web page written with Polymer
- Open devtools and navigate to the `Polymer` pane

<b>Basic Usage:</b>

- You will see a composed DOM tree generated from the page in the devtools pane.
- This tree is kept live to reflect the actual DOM tree.
- You can hover over the elements shown and it highlights them in the page.
- You can select a Polymer element and it will show all the Polymer relevant properties and methods of the object. The element also remains highlighted on the page.
- You may modify the states and it will apply those changes. This is a good way to experiment with data-binding.
- The object tree is kept live with the actual page objects
- You will see all the methods of the element under the object tree. If you select any of them, it will add a breakpoint to that method.

<b>Note:</b>
It needs Object.observe() to work which means only Chrome 36 and above.
