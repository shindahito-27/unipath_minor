import * as notificationService from '../services/notification.service.js';

function asyncHandler(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

export const list = asyncHandler(async (request, response) => {
  const data = await notificationService.listNotifications(request.user);
  response.json({ success: true, data, unreadCount: data.filter((item) => !item.read).length });
});

export const markRead = asyncHandler(async (request, response) => {
  const data = await notificationService.markNotificationRead(request.params.id, request.user);
  response.json({ success: true, data });
});

export const markAllRead = asyncHandler(async (request, response) => {
  const data = await notificationService.markAllNotificationsRead(request.user);
  response.json({ success: true, data });
});
