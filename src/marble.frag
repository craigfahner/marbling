// Using Jaffer et al's approach to mathematical marbling.
// http://people.csail.mit.edu/jaffer/Marbling/

precision mediump float;

const float ALPHA = 0.25;
const float LAMBDA = 0.02;
const int MAX_OPS = 32;

// each operation has several parameters
struct Operation {
  int type;     // type of the opeartion, initial value -1, drop 0, comb 1
  float scale;  // scale of this operation
  vec4 color;   // color of this operation
  vec2 start;   // the location of the operation start 
  vec2 end;     // the location of the operation end, for a single drop, end is start + scale
};

uniform sampler2D backgroundTexture;
uniform vec2 resolution;
uniform vec3 backgroundColor;
uniform int operationCount;
uniform Operation operations[MAX_OPS];

vec4 getColorAtPosition(vec2 p) {

  for (int i = 0; i < MAX_OPS; i++) {

    // can store at most 32 operations

    if (i >= operationCount) {

      // currently we haven't stored too much operations 
      // texture2D function returns the color of the point in the backgroundTexture (pervious background)
      // this means: just return the same color as before

      return texture2D(backgroundTexture, p);
    }

    Operation op = operations[i];

    // if current operation is a single drop

    if (op.type == 0) {

      // a vector d start from [the mouse location where you drop] to [the point p] (where you want to get the color)
      vec2 d = p - op.start;

      // determine the radius of the drop by scale
      float r = length(op.end - op.start) * op.scale;

      // the distance between the drop and the point p
      float l = length(d);

      // if the distance is smaller then the radius
      // which means the point p locates inside the drop
      
      if (l < r) {

        // the gpu should return the color of this operation (drop)

        return op.color;
      }
      else {

        // otherwise the  gpu should return the color of a point p' that is 'near' the point p
        // because the drops and drops will affect each other 
        // there exists a mapping between the p' and p
        // given by the following equation
        
        float l2 = sqrt((l * l) - (r * r));

        // by doing d/l (a vector devided by its length), the vector d is normalized
        // basically, this means p' is where we move distacne l2 from op.start in direction d
        // this makes sense
        // just like a drop makes the pixels around it go further away

        p = op.start + (d / l * l2);
      }
      // this is 80% the same as the equation listed in the following page
      // https://people.csail.mit.edu/jaffer/Marbling/stroke.pdf
    }

    // if current operation is a comb operation

    else if (op.type == 1) {

      // alpha is the length of vector, direction of this vector is from the operation start to end
      float alpha = length(op.end - op.start);


      float beta = max(op.scale * 0.25, 2.0 / (resolution.x + resolution.y));

      // the length of the vector need to be larger then a threshold,
      // this makes sense, only if the distance that the mouse moves is larger then 0.01, will the shader think this is a valid move.

      if (alpha > 0.01) {

        // normalize the vector
        vec2 m = (op.end - op.start) / alpha;
        
        // n is the perpendicular vector of m
        vec2 n = vec2(-m.y, m.x);
        
        float l1 = length(dot(p - op.start, n));
        float l2 = abs(mod(l1, beta * 2.0) - beta);

        // l3 makes huge difference
        float l3 = (alpha * LAMBDA) / (beta - l2 + LAMBDA);


        p = p - (m * l3 * pow(l2 / beta, 2.0));
      }
    }
  }

  return texture2D(backgroundTexture, p);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  gl_FragColor = getColorAtPosition(uv);
  // gl_FragColor = vec4(0.5, 0.3, 0.2, 0.6);
}
