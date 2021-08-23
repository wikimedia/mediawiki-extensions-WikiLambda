<?php
/**
 * WikiLambda ZObjectSlotDiffRenderer
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use Content;
use SlotDiffRenderer;

class ZObjectSlotDiffRenderer extends SlotDiffRenderer {

	/**
	 * @inheritDoc
	 */
	public function getDiff(
		Content $oldContent = null,
		Content $newContent = null
	) {
		// TODO
		return '';
	}

}
