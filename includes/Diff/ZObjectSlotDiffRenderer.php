<?php
/**
 * WikiLambda ZObjectSlotDiffRenderer
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Diff;

use Content;
use Diff\DiffOp\Diff\Diff;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use SlotDiffRenderer;

class ZObjectSlotDiffRenderer extends SlotDiffRenderer {

	/**
	 * @inheritDoc
	 */
	public function getDiff(
		Content $oldContent = null,
		Content $newContent = null
	) {
		// Create the entrypoint differ ZObjectDiffer and call doDiff
		$differ = new ZObjectDiffer();
		$diff = $differ->doDiff(
			( $oldContent === null ) ? [] : $this->toDiffArray( $oldContent ),
			( $newContent === null ) ? [] : $this->toDiffArray( $newContent )
		);

		$diffObj = new Diff( $diff, true );

		// FIXME: Return string representation of the diff
		return '';
	}

	/**
	 * Helper function to extract and transform the data from content before
	 * calling the ZObjectDiffer::doDiff method.
	 *
	 * @param Content $content
	 * @return array
	 */
  private function toDiffArray( Content $content ): array {
		'@phan-var ZObjectContent $content';
		return [
			'root' => json_decode( json_encode( $content->getObject() ), true )
		];
  }
}
