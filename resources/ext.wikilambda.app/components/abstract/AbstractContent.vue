<!--
	WikiLambda Vue component for the Abstract Content object.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-widget-base class="ext-wikilambda-app-abstract-content">
		<template #header>
			<!-- FIXME internationalize when we have decided naming -->
			Abstract content object
		</template>
		<template #header-action>
			<!-- FIXME where to put the Publish button? -->
			<!-- FIXME publish action once we have edit API? -->
			<cdx-button
				v-if="edit"
				class="ext-wikilambda-app-abstract-content__publish"
				action="progressive"
				weight="primary"
				:disabled="!isDirty"
				@click.stop="waitAndHandlePublish"
			>
				{{ i18n( 'wikilambda-publishnew' ).text() }}
			</cdx-button>
			<wl-publish-dialog
				:show-dialog="showPublishDialog"
				:submit-action="submitAction"
				:success-callback="successCallback"
				@close-dialog="closePublishDialog"
			></wl-publish-dialog>
			<!-- TODO add leave-editor-dialog? -->
		</template>
		<template #main>
			<div
				v-for="section in sections"
				:key="`${section.index}-${section.qid}`"
				class="ext-wikilambda-app-abstract-content__section"
			>
				<!-- Section title: label of section Qid in the user language -->
				<div class="ext-wikilambda-app-abstract-content__section-title">
					<h2>
						{{ section.labelData.label }} <span>({{ section.qid }})</span>
					</h2>
				</div>
				<!-- Section fragments: default component node -->
				<div class="ext-wikilambda-app-abstract-content__section-fragments">
					<wl-z-object-key-value
						v-if="section.fragments"
						:key-path="section.fragmentsPath"
						:object-value="section.fragments"
						:edit="edit"
						:skip-key="true"
						:skip-indent="true"
					></wl-z-object-key-value>
				</div>
			</div>
			<!-- FIXME: Stretch goal: add new sections -->
			<!-- <cdx-button
				v-if="edit"
				action="default"
				weight="primary"
				@click="console.log"
				>Add section</cdx-button>
			</cdx-button>-->
		</template>
	</wl-widget-base>
</template>

<script>
const { computed, defineComponent, inject, ref } = require( 'vue' );
const { storeToRefs } = require( 'pinia' );

const useMainStore = require( '../../store/index.js' );

// Base components
const WidgetBase = require( '../base/WidgetBase.vue' );
// Type components
const ZObjectKeyValue = require( '../types/ZObjectKeyValue.vue' );
// Codex components
const { CdxButton } = require( '../../../codex.js' );
// Widget components
const PublishDialog = require( '../widgets/publish/PublishDialog.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-abstract-content',
	components: {
		'wl-widget-base': WidgetBase,
		'wl-publish-dialog': PublishDialog,
		'wl-z-object-key-value': ZObjectKeyValue,
		'cdx-button': CdxButton
	},
	props: {
		edit: {
			type: Boolean,
			required: true
		}
	},
	setup() {
		const i18n = inject( 'i18n' );
		const store = useMainStore();
		const { isDirty } = storeToRefs( store );

		/**
		 * @return {Array}
		 */
		const sections = computed( () => store.getAbstractContentSections );

		// Publish state and actions
		const showPublishDialog = ref( false );

		/**
		 * Waits for running parsers to return and persist
		 * changes before going ahead and running the function call
		 */
		function waitAndHandlePublish() {
			store.waitForRunningParsers.then( () => handlePublish() );
		}

		/**
		 * Handle click event on Publish button: opens the publish dialog.
		 */
		function handlePublish() {
			const isValid = store.validateAbstractWikiContent();
			if ( isValid ) {
				showPublishDialog.value = true;
			}
		}

		// Publish actions
		/**
		 * Call store action for Abstract Wiki content submission
		 *
		 * @param {Object} payload
		 * @param {string} payload.summary
		 * @return {Promise}
		 */
		function submitAction( { summary } ) {
			return store.submitAbstractWikiContent( { summary } );
		}

		/**
		 * Actions to run after a publish action has finished
		 * successfully.
		 *
		 * @param {Object} response
		 */
		function successCallback( response ) {
			// TODO clear errors
			// TODO move new abstract url creation to urlUtils
			const pageUrl = new mw.Title( response.title ).getUrl();
			const linkUrl = new URL( pageUrl, window.location.origin );
			window.location.href = linkUrl;
		}

		/**
		 * Close publish dialog
		 */
		function closePublishDialog() {
			showPublishDialog.value = false;
		}

		return {
			isDirty,
			sections,
			waitAndHandlePublish,
			closePublishDialog,
			showPublishDialog,
			submitAction,
			successCallback,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-abstract-content {
	.ext-wikilambda-app-abstract-content__section {
		margin-bottom: @spacing-150;
	}

	.ext-wikilambda-app-abstract-content__section-title h2 span {
		font-size: @font-size-medium;
	}
}
</style>
