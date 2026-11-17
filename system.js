function updateSystem(){
 const {value,get,trace,plot}=Lab;
 const K=value('K'),tau=value('tau'),target=value('target'),z=value('z'),w=value('wn');
 // Match the PI characteristic polynomial to the chosen damping and frequency.
 // Saturation can change the actual response, so check the simulated result too.
 const kp=(2*z*w*tau-1)/K,ki=tau*w*w/K;
 const res=simulate({plant:firstOrder({K,tau}),Kp:kp,Ki:ki,Kd:0,r:target,T:15,dt:.0005,umin:0,umax:100,antiWindup:true});
 const metrics=Lab.measure(res.t,res.y,target);
 get('gains').textContent=`PI gains: Kp = ${kp.toFixed(5)}, Ki = ${ki.toFixed(5)}. Predicted characteristic damping ζ = ${z.toFixed(2)}. Steady PWM required = ${(target/K).toFixed(2)}%.`;
 plot('outputPlot',[trace('Motor speed',res.t,res.y),trace('Target',[0,15],[target,target],{line:{dash:'dash'}})],'Speed (encoder units/s)');
 plot('commandPlot',[trace('PWM %',res.t,res.u),trace('PWM limit',[0,15],[100,100],{line:{dash:'dot'}})],'PWM (%)');
 Lab.readouts('results',metrics);
 const pass=metrics.overshoot<=10&&metrics.settle!==null&&metrics.settle<=3&&metrics.error<=1;
 get('systemStatus').textContent=(pass?'PASS: simulated response meets the demonstration spec. ':'FAIL: tune ωn or choose a feasible target to meet the demonstration spec. ')+(target/K>100?'Target requires more than 100% steady PWM. ':'')+(kp<0?'The selected pole match gives negative Kp. Increase ωn or revisit the design. ':'');
 get('sourceStatus').textContent=get('source').value.trim()?'Source entered by team: '+get('source').value.trim():'Measurement evidence pending. Current values are a demonstration model.';
 get('arduino').textContent=`// Encoder integration template. Complete readSpeed() using your encoder.
const float Kp = ${kp.toFixed(7)}, Ki = ${ki.toFixed(7)};
const float target = ${target.toFixed(3)}, Ts = 0.01f;
unsigned long lastSample;
float integral = 0;
float readSpeed() {
  // Return encoder speed in the same units as target.
  // Replace this deliberate compile-time reminder with your encoder implementation.
  #error Implement readSpeed using your encoder measurement
}
void setup() { pinMode(9, OUTPUT); analogWrite(9, 0); lastSample=micros(); }
void loop() {
  unsigned long now=micros();
  if ((unsigned long)(now-lastSample)<10000UL) return;
  lastSample=now;
  float error=target-readSpeed();
  float candidate=integral+Ts*error;
  float rawCandidate=Kp*error+Ki*candidate;
  if (!((rawCandidate>100 && error>0)||(rawCandidate<0 && error<0))) integral=candidate;
  float pwm=constrain(Kp*error+Ki*integral,0.0f,100.0f);
  analogWrite(9,(int)(pwm*255.0f/100.0f+0.5f));
}`;
}
Lab.bind(['K','tau','target','z','wn','source'],updateSystem);
Lab.copy();
