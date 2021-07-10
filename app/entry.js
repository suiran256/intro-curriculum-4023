import $ from 'jquery';
// import bootstrap from 'bootstrap';
import 'bootstrap';

// const global = Function('return this;')();
// global.jQuery = $;

[$('.availability-toggle-button').get(0)].forEach((e) => {
  // $('.availability-toggle-button').each((i, e) => {
  const button = $(e);
  button.click(() => {
    const scheduleId = button.data('schedule-id');
    const userId = button.data('user-id');
    const candidateId = button.data('candidate-id');
    const availability = parseInt(button.data('availability'), 10);
    const nextAvailability = (availability + 1) % 3;
    $.post(
      `/schedules/${scheduleId}/users/${userId}/candidates/${candidateId}`,
      { availability: nextAvailability },
      (data) => {
        button.data('availability', data.availability);
        const availabilityLabels = ['ketsu', '?', 'de'];
        button.text(availabilityLabels[data.availability]);

        const buttonStyles = ['btn-danger', 'btn-secondary', 'btn-success'];
        button.removeClass('btn-danger btn-secondary btn-success');
        button.addClass(buttonStyles[data.availability]);
      }
    );
  });
});

const buttonSelfComment = $('#self-comment-button');
buttonSelfComment.click(() => {
  const scheduleId = buttonSelfComment.data('schedule-id');
  const userId = buttonSelfComment.data('user-id');
  const comment = prompt('inputComment');
  if (comment) {
    $.post(
      `/schedules/${scheduleId}/users/${userId}/comments`,
      { comment },
      (data) => {
        $('#self-comment').text(data.comment);
      }
    );
  }
});
