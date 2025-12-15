<!--
	WikiLambda Vue root component to render the Default View

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-default-view">
		<div class="ext-wikilambda-app-row">
			<div class="ext-wikilambda-app-col ext-wikilambda-app-col-6 ext-wikilambda-app-col-tablet-24">
				<!-- Widget About -->
				<wl-about-widget
					:edit="edit"
					:type="contentType"
					@edit-multilingual-data="dispatchLoadEventForEditMultilingualData"
				></wl-about-widget>

				<!-- Widget Function Explorer -->
				<wl-function-explorer-widget
					v-if="hasFunctionWidgets"
					:function-zid="targetFunctionZid"
					:edit="edit"
					:implementation="implementationMode"
				></wl-function-explorer-widget>
			</div>

			<div class="ext-wikilambda-app-col ext-wikilambda-app-col-12 ext-wikilambda-app-col-tablet-24">
				<!-- Persistent Object content block -->
				<wl-widget-base data-testid="content">
					<template #header>
						{{ i18n( 'wikilambda-persistentzobject-contents' ).text() }}
					</template>
					<template #header-action>
						<div v-if="helpLink" class="ext-wikilambda-app-default-view__help-link">
							<a :href="i18n( helpLink.link ).parse()" target="_blank">
								{{ isMobile ? i18n( helpLink.shortText ).parse() : i18n( helpLink.text ).parse() }}
							</a>
						</div>
					</template>
					<template #main>
						<wl-z-object-key-value
							v-if="objectValue"
							:key-path="initialKeyPath"
							:object-value="objectValue"
							:edit="edit"
							:skip-key="true"
							:skip-indent="true"
						></wl-z-object-key-value>
					</template>
				</wl-widget-base>
			</div>

			<div class="ext-wikilambda-app-col ext-wikilambda-app-col-6 ext-wikilambda-app-col-tablet-24">
				<!-- Widget Publish Dialog -->
				<wl-publish-widget
					v-if="edit"
					:is-dirty="isDirty"
				></wl-publish-widget>

				<!-- Widget Function Report -->
				<wl-function-report-widget
					v-if="hasFunctionWidgets"
					:function-zid="targetFunctionZid"
					:content-type="contentType"
				></wl-function-report-widget>

				<!-- Widget Function Evaluator -->
				<wl-function-evaluator-widget
					v-if="hasFunctionWidgets"
					:function-zid="targetFunctionZid"
					:content-type="contentType"
				></wl-function-evaluator-widget>
			</div>
		</div>
	</div>
</template>

<script>
const { computed, defineComponent, inject, onMounted } = require( 'vue' );
const { storeToRefs } = require( 'pinia' );

const Constants = require( '../Constants.js' );
const useBreakpoints = require( '../composables/useBreakpoints.js' );
const useEventLog = require( '../composables/useEventLog.js' );
const useType = require( '../composables/useType.js' );
const useMainStore = require( '../store/index.js' );
const { helpLinks } = require( '../utils/helpUtils.js' );

// Base components
const WidgetBase = require( '../components/base/WidgetBase.vue' );
// Type components
const ZObjectKeyValue = require( '../components/types/ZObjectKeyValue.vue' );
// Widget components
const AboutWidget = require( '../components/widgets/about/About.vue' );
const FunctionEvaluatorWidget = require( '../components/widgets/function-evaluator/FunctionEvaluator.vue' );
const FunctionExplorerWidget = require( '../components/widgets/function-explorer/FunctionExplorer.vue' );
const FunctionReportWidget = require( '../components/widgets/function-report/FunctionReport.vue' );
const PublishWidget = require( '../components/widgets/publish/Publish.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-default-view',
	components: {
		'wl-about-widget': AboutWidget,
		'wl-publish-widget': PublishWidget,
		'wl-function-evaluator-widget': FunctionEvaluatorWidget,
		'wl-function-explorer-widget': FunctionExplorerWidget,
		'wl-function-report-widget': FunctionReportWidget,
		'wl-widget-base': WidgetBase,
		'wl-z-object-key-value': ZObjectKeyValue
	},
	emits: [ 'mounted' ],
	setup( _, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();
		const { isDirty } = storeToRefs( store );
		const { submitInteraction } = useEventLog();
		const { typeToString } = useType();
		const breakpoint = useBreakpoints( Constants.BREAKPOINTS );

		const initialKeyPath = `${ Constants.STORED_OBJECTS.MAIN }.${ Constants.Z_PERSISTENTOBJECT_VALUE }`;

		// Computed properties
		/**
		 * Returns the initial persistent object content ZObject
		 *
		 * @return {Object|Array|undefined}
		 */
		const objectValue = computed( () => {
			const jsonObject = store.getJsonObject( Constants.STORED_OBJECTS.MAIN );
			return jsonObject ? jsonObject[ Constants.Z_PERSISTENTOBJECT_VALUE ] : undefined;
		} );

		/**
		 * Returns whether we are in an edit page according to the URL
		 *
		 * @return {boolean}
		 */
		const edit = computed( () => !store.getViewMode );

		/**
		 * Returns the type of the content object
		 *
		 * @return {string}
		 */
		const contentType = computed( () => typeToString( store.getCurrentZObjectType ) );

		/**
		 * Whether the page contains function widgets (is an implementation or a tester page)
		 *
		 * @return {boolean}
		 */
		const hasFunctionWidgets = computed( () => contentType.value === Constants.Z_IMPLEMENTATION ||
				contentType.value === Constants.Z_TESTER );

		/**
		 * @return {string|undefined}
		 */
		const targetFunctionZid = computed( () => store.getCurrentTargetFunctionZid );

		/**
		 * @return {string|undefined}
		 */
		const implementationMode = computed( () => store.getCurrentZImplementationType );

		// Methods
		/**
		 * Dispatch event (via Metrics Platform) to record loading this view,
		 * or editing the About widget content.
		 * This event indicates that the user is either (a) viewing a ZObject,
		 * (b) starting to create a new one, or (c) starting to edit an existing one.
		 * For case (a) editValue should be false; otherwise true.
		 *
		 * @param {string} editValue
		 */
		function dispatchLoadEvent( editValue ) {
			// Log an event using Metrics Platform's core interaction events
			const interactionData = {
				zobjecttype: contentType.value || null,
				zobjectid: store.getCurrentZObjectId || null,
				zlang: store.getUserLangZid || null
			};
			let action = '';
			if ( !editValue ) {
				action = 'view';
			} else {
				action = store.isCreateNewPage ? 'create' : 'edit';
			}
			submitInteraction( action, interactionData );
		}

		/**
		 * This method handles a click of the edit-icon in the About widget. If edit = false,
		 * we regard this click as the beginning of an edit journey of the current ZObject. But if
		 * we are already in edit mode (edit = true), this journey has already begun and the
		 * appropriate event has already been dispatched.
		 * TODO (T352141): Consider counting "About info" editing separately
		 */
		function dispatchLoadEventForEditMultilingualData() {
			if ( !edit.value ) {
				dispatchLoadEvent( true );
			}
		}

		/**
		 * Whether the display is of the size of a mobile screen
		 *
		 * @return {boolean}
		 */
		const isMobile = computed( () => breakpoint.current.value === Constants.BREAKPOINT_TYPES.MOBILE );

		/**
		 * Help link for this content type, or undefined if none
		 *
		 * @return {string|undefined}
		 */
		const helpLink = computed( () => helpLinks[ contentType.value ] );

		// Lifecycle
		onMounted( () => {
			dispatchLoadEvent( edit.value );
			emit( 'mounted' );
		} );

		return {
			// Reactive store data
			isDirty,
			// Other data
			contentType,
			dispatchLoadEventForEditMultilingualData,
			edit,
			hasFunctionWidgets,
			helpLink,
			isMobile,
			i18n,
			implementationMode,
			initialKeyPath,
			objectValue,
			targetFunctionZid
		};
	}
} );
</script>

<style lang="less">
@import '../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-default-view {
	.ext-wikilambda-app-default-view__message {
		margin-bottom: @spacing-125;
	}

	.ext-wikilambda-app-default-view__help-link {
		font-size: @font-size-small;
	}
}
</style>
