# Marbled Paper

Paper marbling is a printing technique for creating intricate patterns of colored ink. This is a mathematical simulation of the process similar to the approach researched by [Jaffer et al.](http://people.csail.mit.edu/jaffer/Marbling/)

By [Jonas Luebbers-Moon](https://jonasluebbers.com)

## Tools

- **Drop**: Click to add large or small dots of ink.
- **Comb**: Click and drag to pull a comb through the ink in a straight line.
- **Spray**: Click and hold to spray small dots everywhere.
- **Smudge**: Click and drag to distort the whole canvas. This one isn't a real-life paper marbling tool, but a bug turned into a feature!

Several preset colors are available, but you can click on the current color to choose your own.

![Examples of each tool](https://cdn.glitch.com/4bad5cba-d20c-4781-9a59-72e7c21169da%2Ftools.jpg?1552625637853)

## How it works

The app is mostly a fragment shader (`src/marble.frag`) that takes a list of *operations* and draws them to a WebGL canvas. An operation is either a drop or comb pattern, as both spray and smudge are just variations of the other two. `src/main.js` is responsible for setting everything up, handling user input and running the animation.

Because the shader can only handle a limited number of operations, old operations that get pushed out of the list by new ones are drawn to a background texture. This texture can accumulate operations endlessly, but it doesn't look as crisp as the operations that are still on the list. You can see the difference between the background and foreground by changing which ones get displayed in the debug options in `src/main.js`.

![A sample image that can be created with this app](https://cdn.glitch.com/4bad5cba-d20c-4781-9a59-72e7c21169da%2FScreen%20Shot%202019-03-15%20at%2012.19.04%20AM.png?1552623566016)

I'm using [Parcel](https://parceljs.org) to build everything in `src` into a hidden `dist` folder.

I used [controlkit](https://github.com/automat/controlKit.js) for the control panel UI.

I recommend [The Book of Shaders](https://thebookofshaders.com) if you want to learn how fragment shaders (and this project) work in detail.

[Here](https://jonasluebbers.com) is my website 😛
