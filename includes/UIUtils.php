<?php
/**
 * WikiLambda UI rendering utilities
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use MediaWiki\Html\Html;
use MediaWiki\Output\OutputPage;
use MediaWiki\Permissions\Authority;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Title\Title;

class UIUtils {
	/**
	 * Generate an inline Codex error chip (cdx-info-chip--error).
	 *
	 * Inline styles are required because Codex does not support inline chip rendering natively.
	 *
	 * @param string $errorKey i18n message key for the visible error text
	 * @param string $dataErrorKey Value for the data-error-key attribute (defaults to $errorKey)
	 * @return string HTML string
	 */
	public static function createErrorChip( string $errorKey, string $dataErrorKey = '' ): string {
		return Html::rawElement(
			'span',
			[
				'class' => 'cdx-info-chip cdx-info-chip--error',
				'style' => 'position:relative;line-height:var(--line-height-medium,1.375rem);'
					. 'padding-left:calc(var(--font-size-medium,1rem) + calc(var(--font-size-medium,1rem) - 6px));',
				'data-error-key' => $dataErrorKey !== '' ? $dataErrorKey : $errorKey,
			],
			Html::element(
				'span',
				[
					'class' => 'cdx-info-chip__icon',
					'style' => 'position:absolute;left:calc((var(--font-size-medium,1rem) - 2px) * .5);',
					'aria-hidden' => 'true',
				]
			) .
			Html::element(
				'span',
				[
					'class' => 'cdx-info-chip__text',
					'style' => 'font-size:var(--font-size-medium,1rem);',
				],
				wfMessage( $errorKey )->text()
			)
		);
	}

	/**
	 * Generate a Codex progress indicator HTML element.
	 *
	 * @param string $ariaLabel The ARIA label for the progress indicator
	 * @return string The HTML of the progress indicator element
	 */
	public static function createCodexProgressIndicator( string $ariaLabel ): string {
		return Html::rawElement(
			'div',
			[ 'class' => 'cdx-progress-indicator' ],
			Html::rawElement(
				'div',
				[ 'class' => 'cdx-progress-indicator__indicator' ],
				Html::element(
					'progress',
					[
						'class' => 'cdx-progress-indicator__indicator__progress',
						'aria-label' => $ariaLabel
					]
				)
			)
		);
	}

	/**
	 * Guard a user-facing view of a (possibly deleted/suppressed) revision.
	 *
	 * Modelled on Article::fetchRevisionRecord(): if the performer may not see the
	 * revision's deleted text, add the appropriate core warning box to the output
	 * and return false so the caller can stop before leaking content.
	 *
	 * Used by both the Abstract-mode and repo-mode view/edit surfaces, which is why
	 * this lives here rather than on either content handler.
	 *
	 * @param RevisionRecord $revision
	 * @param Authority $performer
	 * @param Title $title Page title, for the rev-deleted-text-permission message
	 * @param OutputPage $output
	 * @return bool True if the revision may be shown to the performer
	 */
	public static function checkRevisionViewable(
		RevisionRecord $revision,
		Authority $performer,
		Title $title,
		OutputPage $output
	): bool {
		if ( $revision->userCan( RevisionRecord::DELETED_TEXT, $performer ) ) {
			return true;
		}

		$msg = $revision->isDeleted( RevisionRecord::DELETED_RESTRICTED )
			? $output->msg( 'rev-suppressed-text' )
			: $output->msg( 'rev-deleted-text-permission', $title->getPrefixedDBkey() );
		// Core pairs its copy of this box with the Codex message-box styles; without
		// them the box renders unstyled on the early-return paths, which emit nothing else.
		$output->addModuleStyles( [ 'mediawiki.codex.messagebox.styles' ] );
		$output->addHTML( Html::errorBox( $msg->parse() ) );

		return false;
	}

}
