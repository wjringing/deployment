import { message } from 'antd';

export const toast = {
  success: (msg) => {
    message.success(msg);
  },
  error: (msg) => {
    message.error(msg);
  },
  warning: (msg) => {
    message.warning(msg);
  },
  info: (msg) => {
    message.info(msg);
  },
  loading: (msg) => {
    return message.loading(msg);
  }
};

export default toast;
