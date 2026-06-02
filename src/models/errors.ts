export type QwenGatewayErrorCode =
  | 'qwen_not_logged_in'
  | 'qwen_challenge_detected'
  | 'qwen_rate_limited'
  | 'qwen_selector_not_found'
  | 'qwen_generation_timeout'
  | 'qwen_download_not_found'
  | 'browser_launch_failed'
  | 'artifact_save_failed'
  | 'invalid_request'
  | 'unsupported_feature'
  | 'qwen_mode_switch_failed'
  | 'qwen_generation_failed';

export class QwenGatewayError extends Error {
  public readonly code: QwenGatewayErrorCode;
  public readonly status: number;

  constructor(code: QwenGatewayErrorCode, message: string, status: number = 500) {
    super(message);
    this.name = 'QwenGatewayError';
    this.code = code;
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      error: {
        message: this.message,
        type: 'browser_gateway_error',
        code: this.code,
      },
    };
  }
}
