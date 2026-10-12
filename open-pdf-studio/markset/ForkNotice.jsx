// Markset fork notice for the About dialog (LGPL-3.0 / GPL-3.0 section 5).
// Lives under markset/ so the build-time brand overlay leaves the upstream
// project's name intact here.
import { openExternal } from '../js/core/platform.js';

export default function ForkNotice() {
  const open = (url) => (e) => { e.preventDefault(); openExternal(url); };
  return (
    <div class="bs-about-company markset-fork-notice">
      <p class="bs-about-company-desc">
        Markset is a modified version of{' '}
        <a href="#" onClick={open('https://github.com/OpenAEC-Foundation/open-pdf-studio')}>Open PDF Studio</a>{' '}
        by the OpenAEC Foundation, used under the GNU Lesser General Public License v3.0.
        Modifications © 2026 Incus Software. The source code of this version is available at{' '}
        <a href="#" onClick={open('https://github.com/incus-software/markset')}>github.com/incus-software/markset</a>.
      </p>
    </div>
  );
}
