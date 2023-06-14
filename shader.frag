precision mediump float;

#define MAX_STEPS 100
#define MIN_DIST_TO_SDF 0.01
#define MAX_DIST_TO_TRAVEL 50.0

uniform vec2 u_resolution;
uniform float u_time;

const vec3 cameraPos = vec3(0.0, 1.5, -5.0);
const vec3 lightPos = vec3(2.0, 2.0, -2.0);
const vec3 spherePos = vec3(0.0, 1.0, 0.0);

float sdfSphere(vec3 p, vec3 center, float radius) {
    return length(p - center) - radius;
}

float sdPlane(vec3 p, vec3 normal, float height) {
    return (dot(p, normal) + height);
}

float smoothMin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5*(a-b)/k, 0.0, 1.0);
    return mix(a, b, h) - k*h*(1.0-h);
}

float getDist(vec3 p) {
    float sphereDist = sdfSphere(p, spherePos + vec3(0.0, 0.5 * sin(2.0 * u_time), 0.0), 1.0);
    float planeDist = sdPlane(p, vec3(0.0, 1.0, 0.0), 0.0);

    //return min(sphereDist, planeDist);
    return smoothMin(sphereDist, planeDist, 0.5);
}

float rayMarch(vec3 ro, vec3 rd, float maxDist) {
    float dist = 0.0;

    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * dist;
        float distToSDF = getDist(p);

        if(dist > maxDist || distToSDF < MIN_DIST_TO_SDF) {
            break;
        }

        dist += distToSDF;
    }
    return dist;
}

vec3 getNormal(vec3 p) {
  vec2 e = vec2(0.001, 0.0);
  vec3 normal = vec3(getDist(p + e.xyy) - getDist(p - e.xyy),
                     getDist(p + e.yxy) - getDist(p - e.yxy),
                     getDist(p + e.yyx) - getDist(p - e.yyx));
  return normalize(normal);
}

float getLight(vec3 p) {
    vec3 normal = getNormal(p);

    // Diffuse light
    float diffuseLight = max(0.0, dot(normalize(lightPos), normal));
    
    // Specular light
    vec3 viewPos = normalize(cameraPos);
    vec3 reflectPos = normalize(reflect(-lightPos, normal));
    float specularLight = max(0.0, dot(viewPos, reflectPos ));
    specularLight = pow(specularLight, 64.0);

    // Ambient light
    float ambientLight = 0.05;
    
    // Combined light
    float light = diffuseLight * 0.75 + specularLight * 0.25;

    // Shadow
    vec3 lightDirection = normalize(lightPos);
    float lightDistance = length(lightPos - p);

    vec3 rayOrigin = p + normal * MIN_DIST_TO_SDF;
    vec3 rayDir = lightDirection;
    float d = rayMarch(rayOrigin, rayDir, lightDistance);

    // If in shade, light is scaled down
    if(d < lightDistance) {
        light *= 0.2;
    }

    light += ambientLight;

    // Gamma correction
    light = pow(light, 0.95);

    return light;
}

void main() {
    vec2 fragCoord = gl_FragCoord.xy;
    //vec2 uv =  2.0 * fragCoord / u_resolution - 1.0; // -1.0 to 1.0
    vec2 uv = (fragCoord - 0.5 * u_resolution) / u_resolution.y; // -1.0 to 1.0

    vec3 color = vec3(uv, 0.0);

    vec3 rayOrigin = cameraPos;
    vec3 rayDir = normalize(vec3(uv.x, uv.y, 1.0));
    float dist = rayMarch(rayOrigin, rayDir, MAX_DIST_TO_TRAVEL);

    vec3 p = rayOrigin + rayDir * dist;
    float light = getLight(p);

    color = vec3(light, light, light);
    gl_FragColor = vec4(color, 1.0);
}

