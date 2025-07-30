#include <Wire.h>
#include <Adafruit_BNO055.h>
#include <utility/imumaths.h>

#define SDA_PIN 22
#define SCL_PIN 19
Adafruit_BNO055 bno(-1, 0x28, &Wire);

// State variables
imu::Quaternion q_ref;           // Reference orientation
float twistAngle = 0;            // Pure X-twist (degrees)
unsigned long last_time = 0;
bool needs_ref_update = true;    // Force first reference update

void setup() {
  Wire.begin(SDA_PIN, SCL_PIN);
  Serial.begin(115200);
  while (!bno.begin()) {
    Serial.println("BNO055 init failed");
    delay(1000);
  }
  bno.setMode(OPERATION_MODE_ACCGYRO);
  Serial.println("Quaternion Twist Tracker Ready");
}

void loop() {
  // 1) Get current orientation
  imu::Quaternion q_current = bno.getQuat();
  q_current.normalize();

  // 2) Update reference orientation when motion stops
  imu::Vector<3> gyro = bno.getVector(Adafruit_BNO055::VECTOR_GYROSCOPE);
  if (gyro.magnitude() < 5.0) {  // Threshold in °/s
    if (needs_ref_update) {
      q_ref = q_current;
      needs_ref_update = false;
      twistAngle = 0;  // Reset angle on new reference
    }
  } else {
    needs_ref_update = true;
  }

  // 3) Calculate relative rotation (q_rel = q_ref⁻¹ * q_current)
  imu::Quaternion q_rel = q_ref.conjugate() * q_current;

  // 4) Extract pure X-twist component
  float sin_theta_over_2 = q_rel.x();  // = sin(θ/2) * axis.x
  float cos_theta_over_2 = q_rel.w();  // = cos(θ/2)
  float theta = 2 * atan2(sin_theta_over_2, cos_theta_over_2) * 180.0/M_PI;

  // 5) Low-pass filter for smooth output
  static float filteredAngle = 0;
  filteredAngle = 0.9 * filteredAngle + 0.1 * theta;

  Serial.print("Pure X-Twist: ");
  Serial.print(filteredAngle, 1);
  Serial.println("°");

  delay(20);
}