<?php

/**
 * WikiLambda HTML fragment renderer with URL policy enforcement
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Renderer;

use MediaWiki\Config\Config;
use MediaWiki\Extension\AbuseFilter\AbuseFilterServices;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\User\UserFactory;
use Psr\Log\LoggerInterface;

class WikifunctionsFragmentRenderer {

	public function __construct(
		private readonly LoggerInterface $logger,
		private readonly UserFactory $userFactory,
		private readonly Config $config,
		private readonly WikifunctionsFragmentImageRenderer $imageRenderer
	) {
	}

	/**
	 * Render an HTML fragment safely.
	 *
	 * Custom <ext-wikilambda-image> tags are replaced with opaque text placeholders before
	 * sanitisation, then substituted with trusted HTML afterwards. This avoids adding
	 * <figure> and <img> to the sanitiser's allowed-element list.
	 *
	 * @param string $html Raw HTML fragment from a Wikifunctions function
	 * @return string Sanitised HTML with image tags replaced by trusted HTML
	 */
	public function render( string $html ): string {
		[ $htmlWithPlaceholders, $imageHtmlMap ] = $this->extractImageElements( $html );
		$sanitised = $this->sanitiseFragment( $htmlWithPlaceholders );
		return $this->restoreImageElements( $sanitised, $imageHtmlMap );
	}

	/**
	 * Replace each <ext-wikilambda-image> tag with a unique text placeholder and build the
	 * map of placeholder → trusted HTML for later restoration.
	 *
	 * Placeholder strings contain no HTML-special characters so Remex passes them through
	 * as text nodes unchanged.
	 *
	 * @param string $html
	 * @return array{0: string, 1: array<string, string>} [$htmlWithPlaceholders, $imageHtmlMap]
	 */
	private function extractImageElements( string $html ): array {
		$imageHtmlMap = [];
		$counter = 0;

		$htmlWithPlaceholders = preg_replace_callback(
			'/<ext-wikilambda-image(?:\s[^>]*)?\/?>/i',
			function ( array $match ) use ( &$imageHtmlMap, &$counter ): string {
				$placeholder = 'WLIMGPLACEHOLDER' . $counter . 'WL';
				$counter++;
				$imageHtmlMap[$placeholder] = $this->renderImageElement( $match[0] );
				return $placeholder;
			},
			$html
		) ?? $html;

		return [ $htmlWithPlaceholders, $imageHtmlMap ];
	}

	/**
	 * Parse and render a single <ext-wikilambda-image> tag.
	 * Returns trusted figure HTML on success, or a placeholder figure with a figcaption
	 * error message if the tag is invalid or the image cannot be rendered.
	 *
	 * @param string $tag Full matched tag, e.g. '<ext-wikilambda-image mid="M123" size="thumb" />'
	 * @return string
	 */
	private function renderImageElement( string $tag ): string {
		preg_match( '/\bmid="(M\d+)"/i', $tag, $midMatch );
		preg_match( '/\bsize="([^"]+)"/i', $tag, $sizeMatch );
		preg_match( '/\balt="([^"]*)"/i', $tag, $altMatch );

		return $this->imageRenderer->render(
			$midMatch[1] ?? null,
			$sizeMatch[1] ?? 'thumb',
			$altMatch[1] ?? null
		);
	}

	/**
	 * Run the HTML sanitiser on the placeholder-substituted fragment.
	 *
	 * @param string $html
	 * @return string
	 */
	private function sanitiseFragment( string $html ): string {
		$blockedDomains = $this->loadBlockedDomains();
		$spamCheckUser = null;
		if ( ExtensionRegistry::getInstance()->isLoaded( 'SpamBlacklist' ) ) {
			$spamCheckUser = $this->userFactory->newAnonymous();
		}

		return WikifunctionsSanitiserTokenHandler::sanitiseHtmlFragment(
			$this->logger,
			$html,
			$blockedDomains,
			$spamCheckUser
		);
	}

	/**
	 * Substitute each placeholder back with its trusted image HTML.
	 *
	 * @param string $html Sanitised HTML containing placeholder strings
	 * @param array<string, string> $imageHtmlMap Placeholder → trusted HTML
	 * @return string
	 */
	private function restoreImageElements( string $html, array $imageHtmlMap ): string {
		foreach ( $imageHtmlMap as $placeholder => $imageHtml ) {
			$html = str_replace( $placeholder, $imageHtml, $html );
		}
		return $html;
	}

	/**
	 * Load the blocked domain map from AbuseFilter's BlockedExternalDomains feature.
	 *
	 * @return array<string, true>
	 */
	private function loadBlockedDomains(): array {
		if (
			ExtensionRegistry::getInstance()->isLoaded( 'Abuse Filter' ) &&
			$this->config->get( 'AbuseFilterEnableBlockedExternalDomain' )
		) {
			return AbuseFilterServices::getBlockedDomainStorage()->loadComputed();
		}
		return [];
	}
}
