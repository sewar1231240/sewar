function updateDigital(){
  const {get,value,plot,trace}=Lab;
  // Read the controls again so both the graph and the Arduino code use the same gains.
  const cfg={K:value('K'),tau:value('tau'),kp:value('kp'),ki:value('ki'),kd:value('kd'),ts:value('ts'),aw:get('aw').checked};
  const res=digitalPID(cfg);
  plot('outputPlot',[trace('Output',res.t,res.y),trace('Setpoint',[0,20],[1,1],{line:{dash:'dash'}})]);
  plot('commandPlot',[trace('Held command',res.t,res.u,{line:{shape:'hv',color:'#854F6C'}}),trace('Upper limit',[0,20],[10,10],{line:{dash:'dot'}})],'Control u');
  Lab.readouts('results',Lab.measure(res.t,res.y,1));
  get('status').textContent=`Ts = ${cfg.ts.toFixed(2)} s · ${(1/cfg.ts).toFixed(1)} updates/s · anti-windup ${cfg.aw?'on':'off'}. The command changes only at sample instants.`;
  get('arduino').textContent=arduinoDigital(cfg);
}
function arduinoDigital(c){return `// A0: calibrated 0–5 measurement. Pin 9: forward PWM, 0–10 command.
const float Kp = ${c.kp}, Ki = ${c.ki}, Kd = ${c.kd};
const float Ts = ${c.ts};
const bool antiWindup = ${c.aw};
const unsigned long sampleUs = ${Math.round(c.ts*1e6)}UL;
unsigned long lastUpdate;
float integral = 0, previousError = 0;
void setup() {
  pinMode(9, OUTPUT);
  analogWrite(9, 0);
  lastUpdate = micros() - sampleUs; // first sample at startup
}
void loop() {
  unsigned long now = micros();
  if ((unsigned long)(now-lastUpdate) < sampleUs) return;
  lastUpdate = now;
  float measured = analogRead(A0) * (5.0f/1023.0f);
  float error = 1.0f - measured;
  float candidate = integral + Ts*error;
  float derivative = (error-previousError)/Ts;
  float rawCandidate = Kp*error + Ki*candidate + Kd*derivative;
  bool windingUp = (rawCandidate>10 && error>0) || (rawCandidate<0 && error<0);
  if (!antiWindup || !windingUp) integral = candidate;
  float raw = Kp*error + Ki*integral + Kd*derivative;
  float command = constrain(raw, 0.0f, 10.0f);
  analogWrite(9, (int)(command*255.0f/10.0f + 0.5f));
  previousError = error;
}
// Keep execution shorter than Ts. Calibrate the I/O conversions before hardware use.`;}
const updateP3=Lab.bind(['kp','ki','kd','ts','K','tau','aw'],updateDigital);
function preset(values){Object.entries(values).forEach(([id,v])=>{Lab.get(id).value=v;});updateP3();}
Lab.get('fast').onclick=()=>preset({kp:4,ki:2,kd:0,ts:.02,K:1,tau:.3});
Lab.get('slow').onclick=()=>preset({kp:4,ki:2,kd:0,ts:1,K:1,tau:.3});
Lab.get('windup').onclick=()=>preset({kp:10,ki:10,kd:0,ts:.02,K:1,tau:3});
Lab.copy();
