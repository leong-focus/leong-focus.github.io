import { ARTIFACT, TOUR_SHOTS, UI_COPY } from './config.js?v=exhibition-prototype-v2';

export function createExhibitionUI(React) {
  const h = React.createElement;
  return function ExhibitionUI({ state, onCommand, ready }) {
    const shot = TOUR_SHOTS[state.shot ?? 0];
    const touring = state.mode === 'autoTour';
    const selected = state.shot === 4 ? 0 : state.shot;
    const themes = TOUR_SHOTS.slice(0, 4).map((item, index) => h('button', {
      key: item.id,
      type: 'button',
      disabled: !ready,
      'aria-pressed': selected === index,
      onClick: () => onCommand('focus', index),
    },
    h('img', {
      className: 'exhibition-theme-thumbnail',
      src: '/celadon/exhibition/' + item.thumbnail,
      alt: '',
      draggable: false,
    }),
    h('span', { className: 'exhibition-theme-label' }, item.label)));
    return h('div', { className: 'exhibition-ui', 'data-mode': state.mode },
      h('div', { className: 'exhibition-screen exhibition-screen-nav' },
        h('div', { className: 'exhibition-nav-content' },
          h('header', { className: 'exhibition-header' },
            h('span', { className: 'exhibition-brand' }, UI_COPY.brand)),
          h('nav', {
            className: 'exhibition-themes',
            'aria-label': '观赏主题',
            style: { '--selected-theme': selected },
          }, ...themes))),
      h('aside', { className: 'exhibition-screen exhibition-screen-info exhibition-panel', 'aria-label': '文物信息' },
        h('div', { className: 'exhibition-panel-content' },
          h('div', { className: 'exhibition-collection' }, ARTIFACT.collection),
          h('h1', null, ARTIFACT.title),
          h('div', { className: 'exhibition-period' }, h('span', { lang: 'zh' }, ARTIFACT.period), h('span', { className: 'exhibition-seal' }, UI_COPY.restored)),
          h('section', { className: 'exhibition-current', 'aria-live': 'polite', 'aria-atomic': true },
            h('div', { className: 'exhibition-eyebrow' }, `${UI_COPY.current} / ${shot.eyebrow}`),
            h('h2', null, shot.title), h('p', null, shot.description),
            h('span', { className: 'exhibition-current-label' }, shot.label)),
          h('div', { className: 'exhibition-actions' },
            h('button', {
              type: 'button', disabled: !ready,
              onClick: () => onCommand(touring ? 'exitTour' : 'tour'),
            }, touring ? UI_COPY.exit : UI_COPY.auto),
            h('a', {
              className: 'exhibition-museum-return', href: '/home/#museum',
            }, UI_COPY.museum)),
          h('a', {
            className: 'exhibition-keepsake exhibition-gallery-link',
            href: '/gallery/',
          }, '进入时光回廊'))),
      h('footer', { className: 'exhibition-hint' }, touring ? UI_COPY.tourHint : UI_COPY.hint));
  };
}
