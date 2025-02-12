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
				<div class="ext-wikilambda-app-default-view__content" data-testid="content">
					<div class="ext-wikilambda-app-default-view__title">
						{{ $i18n( 'wikilambda-persistentzobject-contents' ).text() }}
					</div>
					<wl-z-object-key-value
						:skip-key="true"
						:skip-indent="true"
						:row-id="contentRowId"
						:edit="edit"
					></wl-z-object-key-value>
				</div>
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
					:z-function-id="targetFunctionZid"
					:root-zid="persistentObjectZid"
					:report-type="contentType"
				></wl-function-report-widget>

				<!-- Widget Function Evaluator -->
				<wl-function-evaluator-widget
					v-if="hasFunctionWidgets"
					:function-zid="targetFunctionZid"
					:content-row-id="contentRowId"
					:for-implementation="isImplementationPage"
				></wl-function-evaluator-widget>
			</div>
		</div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapState } = require( 'pinia' );

const Constants = require( '../Constants.js' );
const AboutWidget = require( '../components/widgets/about/About.vue' );
const FunctionEvaluatorWidget = require( '../components/widgets/function-evaluator/FunctionEvaluator.vue' );
const FunctionExplorerWidget = require( '../components/widgets/function-explorer/FunctionExplorer.vue' );
const FunctionReportWidget = require( '../components/widgets/function-report/FunctionReport.vue' );
const PublishWidget = require( '../components/widgets/publish/Publish.vue' );
const ZObjectKeyValue = require( '../components/default-view-types/ZObjectKeyValue.vue' );
const eventLogUtils = require( '../mixins/eventLogUtils.js' );
const typeUtils = require( '../mixins/typeUtils.js' );
const useMainStore = require( '../store/index.js' );

module.exports = exports = defineComponent( {
	name: 'wl-default-view',
	components: {
		'wl-about-widget': AboutWidget,
		'wl-publish-widget': PublishWidget,
		'wl-function-evaluator-widget': FunctionEvaluatorWidget,
		'wl-function-explorer-widget': FunctionExplorerWidget,
		'wl-function-report-widget': FunctionReportWidget,
		'wl-z-object-key-value': ZObjectKeyValue
	},
	mixins: [ eventLogUtils, typeUtils ],
	computed: Object.assign(
		mapState( useMainStore, [
			'getZPersistentContentRowId',
			'getRowByKeyPath',
			'getViewMode',
			'getZObjectTypeByRowId',
			'getZImplementationContentType',
			'getZReferenceTerminalValue',
			'getZStringTerminalValue',
			'getRowByKeyPath',
			'isDirty',
			'isCreateNewPage',
			'getCurrentZObjectId',
			'getUserLangZid'
		] ), {
			/**
			 * Returns whether we are in an edit page according
			 * to the URL
			 *
			 * @return {boolean}
			 */
			edit: function () {
				return !this.getViewMode;
			},

			/**
			 * Returns the rowId where the persistent object content starts
			 *
			 * @return {number}
			 */
			contentRowId: function () {
				return this.getZPersistentContentRowId() || 0;
			},

			/**
			 * Returns the type of the content object
			 *
			 * @return {string}
			 */
			contentType: function () {
				return this.typeToString( this.getZObjectTypeByRowId( this.contentRowId ) );
			},

			/**
			 * Whether the page contains function widgets (is an
			 * implementation or a tester page)
			 *
			 * @return {boolean}
			 */
			hasFunctionWidgets: function () {
				return this.isImplementationPage || this.isTesterPage;
			},

			/**
			 * Whether the page is an implementation page
			 *
			 * @return {boolean}
			 */
			isImplementationPage: function () {
				return this.contentType === Constants.Z_IMPLEMENTATION;
			},

			/**
			 * Whether the page is an implementation page
			 *
			 * @return {boolean}
			 */
			isTesterPage: function () {
				return this.contentType === Constants.Z_TESTER;
			},

			/**
			 * @return {string|undefined}
			 */
			persistentObjectZid: function () {
				const row = this.getRowByKeyPath( [ Constants.Z_PERSISTENTOBJECT_ID ], 0 );
				return row ? this.getZStringTerminalValue( row.id ) : undefined;
			},

			/**
			 * @return {number|undefined}
			 */
			targetFunctionRowId: function () {
				let key;
				if ( this.contentType === Constants.Z_IMPLEMENTATION ) {
					key = Constants.Z_IMPLEMENTATION_FUNCTION;
				} else if ( this.contentType === Constants.Z_TESTER ) {
					key = Constants.Z_TESTER_FUNCTION;
				} else {
					return undefined;
				}
				const row = this.getRowByKeyPath( [ key ], this.contentRowId );
				return row ? row.id : undefined;
			},

			/**
			 * @return {string|undefined}
			 */
			targetFunctionZid: function () {
				return this.getZReferenceTerminalValue( this.targetFunctionRowId );
			},

			/**
			 * @return {string|undefined}
			 */
			implementationMode: function () {
				if ( this.contentType === Constants.Z_IMPLEMENTATION ) {
					return this.getZImplementationContentType( this.contentRowId );
				}
			}
		}
	),
	methods: {
		/**
		 * Dispatch event (via Metrics Platform) to record loading this view,
		 * or editing the About widget content.
		 * This event indicates that the user is either (a) viewing a ZObject,
		 * (b) starting to create a new one, or (c) starting to edit an existing one.
		 * For case (a) editValue should be false; otherwise true.
		 *
		 * @param {string} editValue
		 */
		dispatchLoadEvent: function ( editValue ) {
			// Log an event using Metrics Platform's core interaction events
			const interactionData = {
				zobjecttype: this.contentType || null,
				zobjectid: this.getCurrentZObjectId || null,
				zlang: this.getUserLangZid || null
			};
			let action = '';
			if ( !editValue ) {
				action = 'view';
			} else {
				action = this.isCreateNewPage ? 'create' : 'edit';
			}
			this.submitInteraction( action, interactionData );
		},
		/**
		 * This method handles a click of the edit-icon in the About widget. If this.edit = false,
		 * we regard this click as the beginning of an edit journey of the current ZObject. But if
		 * we are already in edit mode (this.edit = true), this journey has already begun and the
		 * appropriate event has already been dispatched.
		 * TODO (T352141): Consider counting "About info" editing separately
		 */
		dispatchLoadEventForEditMultilingualData: function () {
			if ( !this.edit ) {
				this.dispatchLoadEvent( true );
			}
		}
	},
	mounted: function () {
		this.dispatchLoadEvent( this.edit );
		this.$emit( 'mounted' );
	}
} );
</script>

<style lang="less">
@import '../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-default-view {
	.ext-wikilambda-app-default-view__content {
		box-sizing: border-box;
		padding: @spacing-75;
		border: 1px solid #c8ccd1;
		border-radius: 2px;
		margin-bottom: @spacing-100;
	}

	.ext-wikilambda-app-default-view__title {
		font-weight: @font-weight-bold;
		margin-bottom: @spacing-125;
		font-size: @font-size-large;
	}
}
</style>
