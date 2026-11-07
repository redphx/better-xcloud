#version 300 es

void main() {
    // Fullscreen triangle from vertex ID: (-1,-1), (3,-1), (-1,3). No buffer needed.
    vec2 pos = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
}
