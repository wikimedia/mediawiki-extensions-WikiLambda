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

class UIUtils {
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
	 * Render a language 'Chip' of a language code with a hover-title of the language's label.
	 *
	 * TODO (T309039): use the actual Vue Chip component from Codex and ZID language object here instead
	 *
	 * @param string $code The BCP47 language code, e.g. 'fr' or 'en-US'.
	 * @param string $label The plain text label of the language, e.g. 'français' or 'American English'
	 * @param string $class The name of the class for the HTML element in which to wrap the label
	 * @return string The HTML of the element to be rendered
	 */
	public static function wrapBCP47CodeInFakeCodexChip(
		string $code,
		string $label,
		string $class
	) {
		$attributes = [
			'title' => $label,
			'class' => $class,
		];
		return Html::element(
			'span',
			$attributes,
			$code
		);
	}

	/**
	 * Get the CSS class name for the BCP47 code based on the type and language codes.
	 *
	 * @param string $type
	 * @param string $langCode
	 * @param string $userLangCode
	 * @return string
	 */
	public static function getBCP47ClassName( string $type, string $langCode, string $userLangCode ): string {
		$baseClass = 'ext-wikilambda-editpage-header__bcp47-code';
		$modifierClass = $type === 'name'
			? 'ext-wikilambda-editpage-header__bcp47-code-name'
			: 'ext-wikilambda-editpage-header__bcp47-code-type';
		$className = $baseClass . ' ' . $modifierClass;
		if ( $langCode === $userLangCode ) {
			$className .= ' ext-wikilambda-editpage-header__bcp47-code--hidden';
		}
		return $className;
	}
}
