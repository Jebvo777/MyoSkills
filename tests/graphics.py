"""Compile and render the actual WebGL shaders with Mesa EGL/GLES2 (no browser)."""
from pathlib import Path
import ctypes as C
import json,os
from PIL import Image

os.environ.setdefault('LIBGL_ALWAYS_SOFTWARE','1')
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/runtime';OUT.mkdir(exist_ok=True)
E=C.CDLL('libEGL.so.1')
E.eglGetProcAddress.argtypes=[C.c_char_p];E.eglGetProcAddress.restype=C.c_void_p
def proc(name,result,args):
    pointer=E.eglGetProcAddress(name.encode())
    if not pointer:raise RuntimeError('Missing GL procedure: '+name)
    return C.CFUNCTYPE(result,*args)(pointer)
def egl(name,result,args):
    fn=getattr(E,name);fn.restype=result;fn.argtypes=args;return fn
I=C.c_int;U=C.c_uint;F=C.c_float;P=C.c_void_p
display=proc('eglGetPlatformDisplayEXT',P,[U,P,C.POINTER(I)])(0x31DD,None,None)
major=I();minor=I();assert egl('eglInitialize',U,[P,C.POINTER(I),C.POINTER(I)])(display,C.byref(major),C.byref(minor))
assert egl('eglBindAPI',U,[U])(0x30A0)
attrs=(I*13)(0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3033,1,0x3040,4,0x3038)
configs=(P*1)();count=I();assert egl('eglChooseConfig',U,[P,C.POINTER(I),C.POINTER(P),I,C.POINTER(I)])(display,attrs,configs,1,C.byref(count)) and count.value
W,H=900,620
surface=egl('eglCreatePbufferSurface',P,[P,P,C.POINTER(I)])(display,configs[0],(I*5)(0x3057,W,0x3056,H,0x3038))
context=egl('eglCreateContext',P,[P,P,P,C.POINTER(I)])(display,configs[0],None,(I*3)(0x3098,2,0x3038))
assert surface and context and egl('eglMakeCurrent',U,[P,P,P,P])(display,surface,surface,context)
shaderCreate=proc('glCreateShader',U,[U]);shaderSource=proc('glShaderSource',None,[U,I,C.POINTER(C.c_char_p),C.POINTER(I)]);compileShader=proc('glCompileShader',None,[U]);shaderGet=proc('glGetShaderiv',None,[U,U,C.POINTER(I)]);shaderLog=proc('glGetShaderInfoLog',None,[U,I,C.POINTER(I),P])
def compile(kind,path):
    shader=shaderCreate(kind);source=C.c_char_p(path.read_bytes());shaderSource(shader,1,C.byref(source),None);compileShader(shader);ok=I();shaderGet(shader,0x8B81,C.byref(ok))
    if not ok.value:
        log=C.create_string_buffer(8192);shaderLog(shader,len(log),None,log);raise RuntimeError(log.value.decode())
    return shader
vertex=compile(0x8B31,ROOT/'assets/shaders/orbit.vert');fragment=compile(0x8B30,ROOT/'assets/shaders/orbit.frag')
program=proc('glCreateProgram',U,[])();attach=proc('glAttachShader',None,[U,U]);attach(program,vertex);attach(program,fragment);proc('glLinkProgram',None,[U])(program)
linked=I();proc('glGetProgramiv',None,[U,U,C.POINTER(I)])(program,0x8B82,C.byref(linked))
if not linked.value:
    log=C.create_string_buffer(8192);proc('glGetProgramInfoLog',None,[U,I,C.POINTER(I),P])(program,len(log),None,log);raise RuntimeError(log.value.decode())
proc('glUseProgram',None,[U])(program)
buffer=U();proc('glGenBuffers',None,[I,C.POINTER(U)])(1,C.byref(buffer));proc('glBindBuffer',None,[U,U])(0x8892,buffer)
vertices=(F*6)(-1,-1,3,-1,-1,3);proc('glBufferData',None,[U,C.c_ssize_t,P,U])(0x8892,C.sizeof(vertices),vertices,0x88E4)
attribute=proc('glGetAttribLocation',I,[U,C.c_char_p])(program,b'aPosition');proc('glEnableVertexAttribArray',None,[U])(attribute);proc('glVertexAttribPointer',None,[U,I,U,U,I,P])(attribute,2,0x1406,0,0,None)
uniform=proc('glGetUniformLocation',I,[U,C.c_char_p]);u1=proc('glUniform1f',None,[I,F]);u2=proc('glUniform2f',None,[I,F,F]);u4=proc('glUniform4f',None,[I,F,F,F,F]);u3=proc('glUniform3fv',None,[I,I,C.POINTER(F)])
loc=lambda name:uniform(program,name.encode())
colors=['9d89f8','61e1ca','ef9daa','9bcaef','e6bf77','dea6d9'];values=[int(h[i:i+2],16)/255 for h in colors for i in (0,2,4)]
u3(loc('uColors[0]'),6,(F*18)(*values));u2(loc('uViewport'),W,H);u2(loc('uPointer'),.12,-.05);u1(loc('uTime'),4);u1(loc('uSelected'),1);u4(loc('uRocket'),.4,.6,.65,1)
proc('glViewport',None,[I,I,I,I])(0,0,W,H)
draw=proc('glDrawArrays',None,[U,I,I]);read=proc('glReadPixels',None,[I,I,I,I,U,U,P]);frames=[]
for mode in (1,0):
    u1(loc('uHero'),mode);draw(4,0,3);proc('glFinish',None,[])()
    assert proc('glGetError',U,[])()==0
    data=(C.c_ubyte*(W*H*4))();read(0,0,W,H,0x1908,0x1401,data)
    img=Image.frombytes('RGBA',(W,H),bytes(data)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    assert sum(img.getchannel('A').histogram()[231:])>5000
    bg=Image.new('RGBA',(W,H),(248,249,254,255) if mode else (23,27,54,255));bg.alpha_composite(img);frames.append(bg.convert('RGB'))
    bg.convert('RGB').save(OUT/('3d-hero.png' if mode else '3d-galaxy.png'))
gallery=Image.new('RGB',(W*2,H));gallery.paste(frames[0],(0,0));gallery.paste(frames[1],(W,0));gallery.save(OUT/'3d-gallery.png')
result={'ok':True,'shader_compilation':True,'program_linking':True,'rendered_scenes':2,'environment':'Mesa EGL GLES2 software rendering; not a browser screenshot'}
(OUT/'graphics-report.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
egl('eglMakeCurrent',U,[P,P,P,P])(display,None,None,None);egl('eglDestroyContext',U,[P,P])(display,context);egl('eglDestroySurface',U,[P,P])(display,surface);egl('eglTerminate',U,[P])(display)
