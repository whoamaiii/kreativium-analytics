import * as tf from '@tensorflow/tfjs';

/**
 * Create emotion prediction model architecture.
 * LSTM-based model for predicting emotional states from time-series data.
 *
 * Architecture:
 * - LSTM(64) with return sequences
 * - Dropout(0.2)
 * - LSTM(32) without return sequences
 * - Dropout(0.2)
 * - Dense(16, relu)
 * - Dense(7, sigmoid) - outputs 7 emotions normalized to 0-1
 *
 * @returns Compiled Sequential model ready for training
 */
export function createEmotionModel(): tf.Sequential {
  const model = tf.sequential({
    layers: [
      tf.layers.lstm({
        units: 64,
        returnSequences: true,
        inputShape: [7, 13] // 7 days, 13 features (7 emotions + 6 time features)
      }),
      tf.layers.dropout({ rate: 0.2 }),
      tf.layers.lstm({
        units: 32,
        returnSequences: false
      }),
      tf.layers.dropout({ rate: 0.2 }),
      tf.layers.dense({
        units: 16,
        activation: 'relu'
      }),
      tf.layers.dense({
        units: 7,
        activation: 'sigmoid' // Output emotions normalized to 0-1
      })
    ]
  });

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'meanSquaredError',
    metrics: ['mse', 'mae']
  });

  return model;
}

/**
 * Create sensory response model architecture.
 * Feed-forward neural network for predicting sensory responses from environmental conditions.
 *
 * Architecture:
 * - Dense(32, relu) with input shape [12]
 * - Dropout(0.2)
 * - Dense(16, relu)
 * - Dropout(0.2)
 * - Dense(15, softmax) - outputs 5 senses × 3 responses (seeking/avoiding/neutral)
 *
 * @returns Compiled Sequential model ready for training
 */
export function createSensoryModel(): tf.Sequential {
  const model = tf.sequential({
    layers: [
      tf.layers.dense({
        units: 32,
        activation: 'relu',
        inputShape: [12] // 6 environment + 6 time features
      }),
      tf.layers.dropout({ rate: 0.2 }),
      tf.layers.dense({
        units: 16,
        activation: 'relu'
      }),
      tf.layers.dropout({ rate: 0.2 }),
      tf.layers.dense({
        units: 15,
        activation: 'softmax' // 5 senses × 3 responses (seeking/avoiding/neutral)
      })
    ]
  });

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });

  return model;
}
