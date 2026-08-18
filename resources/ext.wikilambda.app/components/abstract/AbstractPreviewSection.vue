<!--
	WikiLambda Vue component for the Abstract Content preview (single language block).

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-abstract-preview-section">
		<!-- h1 with article title if section is lede; h2 with section title otherwise -->
		<component
			:is="section.isLede ? 'h1' : 'h2'"
			class="ext-wikilambda-app-abstract-preview-section__header"
		>
			{{ section.isLede ? abstractTitle.label : section.labelData.label }}
			<button
				v-if="hasSomePendingFragments"
				type="button"
				class="ext-wikilambda-app-button-reset ext-wikilambda-app-abstract-preview-section__button"
				:aria-label="i18n( 'wikilambda-abstract-preview-fragment-retry' ).text()"
				@click.stop="renderSectionPreview"
			>
				<cdx-icon :icon="iconRetry"></cdx-icon>
			</button>
		</component>
		<div v-if="errors.length" class="ext-wikilambda-app-abstract-preview-section-errors">
			<cdx-message
				v-for="( error, index ) in errors"
				:key="`err-${index}`"
				:type="error.type"
			>
				<wl-safe-message :error="error"></wl-safe-message>
			</cdx-message>
		</div>
		<wl-abstract-preview-fragment
			v-for="( fragment, index ) in fragmentList"
			:key="`${section.index}-${section.qid}-${index}`"
			:key-path="`${ section.fragmentsPath }.${ index + 1 }`"
			:fragment-hash="fragmentHashes[ index ]"
			@fragment-changed="regenerateHash( index )"
			@retry="renderFragmentPreview( index )"
		></wl-abstract-preview-fragment>
	</div>
</template>

<script>
const { computed, defineComponent, inject, onMounted, watch } = require( 'vue' );

const useMainStore = require( '../../store/index.js' );
const icons = require( '../../../lib/icons.json' );

// Base components
const StatusIcon = require( '../base/StatusIcon.vue' );
const SafeMessage = require( '../base/SafeMessage.vue' );
// Abstract components
const AbstractPreviewFragment = require( './AbstractPreviewFragment.vue' );
// Codex components
const { CdxButton, CdxMessage, CdxIcon } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-abstract-preview-section',
	components: {
		'wl-abstract-preview-fragment': AbstractPreviewFragment,
		'wl-status-icon': StatusIcon,
		'wl-safe-message': SafeMessage,
		'cdx-button': CdxButton,
		'cdx-message': CdxMessage,
		'cdx-icon': CdxIcon
	},
	props: {
		/**
		 * Section carries raw and computed data on the section:
		 * E.g. {
		 *   "qid": "Q82799",
		 *   "isLede": false,
		 *   "labelData": LabelData( sectionQid ),
		 *   "fragmentsPath": "abstractwiki.sections.Q82799.fragments",
		 *   "index": 1,
		 *   "fragments": [ 'Z89', fragment1, fragment2 ]
		 * }
		 */
		section: {
			type: Object,
			required: true
		},
		language: {
			type: String,
			required: true
		}
	},
	setup( props ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		const iconRetry = icons.cdxIconReload;

		// Fragment list without the benjamin item, to share indexes with fragmentHashes
		const fragmentList = computed( () => props.section.fragments.slice( 1 ) );

		// List of hashes for the section fragments
		const fragmentHashes = computed( () => store.getAbstractSectionHashes( props.section.qid ) );

		// Resolve in the selected preview language, not the interface language, so the
		// title stays in sync with the rest of the generated text.
		const abstractTitle = computed( () => store.getItemLabelData(
			store.getAbstractWikiId,
			store.getLanguageIsoCodeOfZLang( props.language )
		) );

		// Show when section has 2 or more pending fragments; when it has only one
		// pending fragment, no point on requesting the whole section.
		// TODO we should think of a more proportionate logic: when a section is 100
		// fragments and only 2 of them are pending, maybe also no point requesting
		// the whole thing, and we can (and should) bother the user to click twice.
		const hasSomePendingFragments = computed( () => (
			store.getPendingCount( props.section.qid, props.language ) > 1 ) );

		// Section API errors
		const sectionPath = computed( () => props.section.fragmentsPath.split( '.', 3 ).join( '.' ) );
		const errors = computed( () => store.getErrors( sectionPath.value ) );

		/**
		 * Request all section fragment previews, as their status in
		 * the current stored revision.
		 */
		function renderSectionPreview() {
			store.clearErrors( sectionPath.value );
			store.fetchSectionPreview( {
				topic: store.getAbstractWikiId,
				section: props.section.qid,
				sectionPath: sectionPath.value,
				fragments: fragmentList.value,
				fragmentHashes: fragmentHashes.value,
				language: props.language
			} );
		}

		/**
		 * Renders the preview of the given fragment for the current topic qid and
		 * preview language.
		 *
		 * This is called every time that the AbstractPreviewFragment emits a 'retry'
		 * event, which can happen:
		 * * When the user manually clicks the "Retry" button for a wanted fragment.
		 * * When a change in the fragment hash causes the FragmentPreview to find
		 *   a blank preview object for that hash (so the function call has never
		 *   been requested before.
		 *
		 * @param {number} index
		 */
		function renderFragmentPreview( index ) {
			store.renderFragmentPreview( {
				qid: store.getAbstractWikiId,
				fragment: fragmentList.value[ index ],
				fragmentHash: fragmentHashes.value[ index ],
				language: store.getPreviewLanguageZid
			} );
		}

		watch( () => props.language, () => {
			renderSectionPreview();
		} );

		// Lifecycle
		onMounted( async () => {
			renderSectionPreview();
		} );

		return {
			abstractTitle,
			errors,
			fragmentList,
			fragmentHashes,
			hasSomePendingFragments,
			iconRetry,
			i18n,
			renderFragmentPreview,
			renderSectionPreview
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-abstract-preview-section {
	.ext-wikilambda-app-abstract-preview-section__header {
		display: flex;
		justify-content: space-between;
	}
}

</style>
