<!--
	WikiLambda Vue component for the provenance popover of an Abstract Content
	fragment preview. Shows how fresh the generated text is, in the same way as
	the "Provenance" section of the Wikifunctions UI. (T441583)

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<cdx-popover
		class="ext-wikilambda-app-abstract-preview-provenance"
		:open="open"
		:anchor="anchor"
		:title="i18n( 'wikilambda-functioncall-metadata-caching' ).text()"
		:icon="iconHistory"
		:use-close-button="true"
		placement="bottom"
		@update:open="$emit( 'update:open', $event )"
	>
		<p class="ext-wikilambda-app-abstract-preview-provenance__summary">
			{{ summary }}
		</p>
		<ul
			v-if="items.length"
			class="ext-wikilambda-app-abstract-preview-provenance__content"
		>
			<wl-function-metadata-item
				v-for="( item, itemIndex ) in items"
				:key="`provenance-${ itemIndex }`"
				:key-string="`provenance-${ itemIndex }`"
				:item="item"
			></wl-function-metadata-item>
		</ul>
		<a
			:href="i18n( 'wikilambda-functioncall-metadata-cache-help-link' ).text()"
			target="_blank"
			class="ext-wikilambda-app-abstract-preview-provenance__link"
		>
			{{ i18n( 'wikilambda-functioncall-metadata-cache-help-label' ).text() }}
			<cdx-icon
				:icon="iconLinkExternal"
				class="ext-wikilambda-app-abstract-preview-provenance__link-icon"
			></cdx-icon>
		</a>
	</cdx-popover>
</template>

<script>
const { computed, defineComponent, inject } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useMainStore = require( '../../store/index.js' );
const { metadataKeys, toRelativeTime, getListOfIds } = require( '../../utils/metadataUtils.js' );
const icons = require( '../../../lib/icons.json' );

// Widget components
const FunctionMetadataItem = require( '../widgets/function-evaluator/FunctionMetadataItem.vue' );
// Codex components
const { CdxIcon, CdxPopover } = require( '../../../codex.js' );

// The freshness metadata keys stored with a rendered fragment, in display order
const PROVENANCE_KEYS = [
	'functionCallCachedOn',
	'functionCallFreshResult',
	'cachedWikidataEntities'
];

/**
 * Converts a MediaWiki timestamp in YmdHis format, which is in UTC,
 * into ISO 8601. Returns any other value unchanged.
 *
 * @param {string|number} timestamp
 * @return {string}
 */
function mwTimestampToIso( timestamp ) {
	const ts = String( timestamp );
	if ( !/^\d{14}$/.test( ts ) ) {
		return ts;
	}
	return `${ ts.slice( 0, 4 ) }-${ ts.slice( 4, 6 ) }-${ ts.slice( 6, 8 ) }T` +
		`${ ts.slice( 8, 10 ) }:${ ts.slice( 10, 12 ) }:${ ts.slice( 12, 14 ) }Z`;
}

module.exports = exports = defineComponent( {
	name: 'wl-abstract-preview-provenance',
	components: {
		'wl-function-metadata-item': FunctionMetadataItem,
		'cdx-icon': CdxIcon,
		'cdx-popover': CdxPopover
	},
	props: {
		/**
		 * Whether the popover is open
		 */
		open: {
			type: Boolean,
			required: true
		},
		/**
		 * The element that the popover points to: the generated text of the fragment
		 */
		anchor: {
			type: Object,
			default: null
		},
		/**
		 * The fragment preview from the store, with its metadata, renderDate
		 * and fromFragmentStore
		 */
		fragmentPreview: {
			type: Object,
			required: true
		}
	},
	emits: [ 'update:open' ],
	setup( props ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		const iconHistory = icons.cdxIconHistory;
		const iconLinkExternal = icons.cdxIconLinkExternal || icons.cdxIconLink;

		const metadata = computed( () => props.fragmentPreview.metadata || {} );
		const hasMetadata = computed( () => Object.keys( metadata.value ).length > 0 );

		/**
		 * The summary line. A fragment that the server read from its fragment store
		 * says so. Otherwise, the summary is as in the Wikifunctions UI, and a
		 * fragment without freshness metadata (e.g. not rendered yet) gets a note
		 * to that effect.
		 */
		const summary = computed( () => {
			if ( props.fragmentPreview.fromFragmentStore ) {
				return i18n( 'wikilambda-abstract-preview-provenance-fragment-store' ).text();
			}
			if ( !hasMetadata.value ) {
				return i18n( 'wikilambda-abstract-preview-provenance-unavailable' ).text();
			}
			if ( 'functionCallFreshResult' in metadata.value ) {
				return i18n( 'wikilambda-functioncall-metadata-fresh' ).text();
			}
			// A newly generated result that used cached Wikidata entities, as in the
			// Wikifunctions UI (T440536).
			if ( !( 'functionCallCachedOn' in metadata.value ) &&
				( 'cachedWikidataEntities' in metadata.value ) ) {
				return i18n( 'wikilambda-functioncall-metadata-fresh-cached-entities' ).text();
			}
			return i18n( 'wikilambda-functioncall-metadata-cached' ).text();
		} );

		// The same transforms as the Wikifunctions UI, by the names in metadataKeys
		const transforms = {
			toRelativeTime,
			getListOfWikidataIds: ( value ) => getListOfIds( value, {
				Q: store.getItemUrl,
				L: store.getLexemeUrl,
				P: store.getPropertyUrl,
				LF: store.getLexemeFormUrl,
				LS: store.getLexemeSenseUrl
			} )
		};

		/**
		 * The rows: when the fragment was rendered, if known, and then the
		 * freshness metadata, with the titles and transforms of the
		 * Wikifunctions UI's "Provenance" section.
		 */
		const items = computed( () => {
			const rows = [];

			if ( props.fragmentPreview.renderDate ) {
				rows.push( {
					title: i18n( 'wikilambda-abstract-preview-provenance-render-date' ).text(),
					data: toRelativeTime( mwTimestampToIso( props.fragmentPreview.renderDate ) )
				} );
			}

			for ( const key of PROVENANCE_KEYS ) {
				if ( !( key in metadata.value ) ) {
					continue;
				}
				const config = metadataKeys.caching.keys.find( ( item ) => item.key === key );
				const transform = transforms[ config.transform ];
				const data = transform ? transform( metadata.value[ key ] ) : metadata.value[ key ];
				rows.push( {
					title: i18n( config.title ).text(),
					// Wrap in a text object if the value is still a string
					data: ( typeof data === 'string' ) ?
						{ type: Constants.METADATA_CONTENT_TYPE.TEXT, value: data } :
						data
				} );
			}

			return rows;
		} );

		return {
			i18n,
			iconHistory,
			iconLinkExternal,
			items,
			summary
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-abstract-preview-provenance {
	.ext-wikilambda-app-abstract-preview-provenance__summary {
		margin: 0 0 @spacing-50;
	}

	.ext-wikilambda-app-abstract-preview-provenance__content {
		margin: 0 0 @spacing-50;
		padding: 0;
		list-style-position: inside;
	}

	.ext-wikilambda-app-abstract-preview-provenance__link {
		display: inline-flex;
		align-items: center;
		gap: @spacing-25;
	}

	.ext-wikilambda-app-abstract-preview-provenance__link-icon {
		color: inherit;
	}
}
</style>
