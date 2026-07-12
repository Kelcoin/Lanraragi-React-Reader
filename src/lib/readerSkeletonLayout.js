const DESKTOP_TOOLBAR = Object.freeze({
  left: Object.freeze(['← 返回', '阅读历史', '待看归档']),
  right: Object.freeze(['沉浸模式', '设为封面', '阅读设定', '编辑元数据', '缩略面板']),
});

const MOBILE_TOOLBAR = Object.freeze({
  left: Object.freeze(['', '', '']),
  right: Object.freeze(['', '', '', '', '']),
});

export function getReaderSkeletonToolbarGroups(isMobile) {
  return isMobile ? MOBILE_TOOLBAR : DESKTOP_TOOLBAR;
}
