<template>
	<!--
		WikiLambda Vue component for the special editor of a ZFunction object.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<editor-base :steps="steps" :progress="currentZFunctionCompletionPercentage">
		<template #default="ctx">
			<component
				:is="currentStepContent"
				:zobject-id="computedZObjectId"
				@navigate-to="ctx.navigateTo"
			></component>
		</template>

		<template #right-aside="ctx">
			<fn-editor-visual-display>
				<template #input>
					{{ $store.getters.getZargumentsString || $i18n( 'wikilambda-editor-input-title' ) }}
				</template>
				<template #function>
					{{ ctx.label ? ctx.label.value ||
						$i18n( 'wikilambda-editor-name-zobject-name' ) :
						$i18n( 'wikilambda-editor-name-zobject-name' )
					}}
				</template>
				<template #output>
					{{ $store.getters.getZkeyLabels[ zReturnType.value ] || $i18n( 'wikilambda-editor-output-title' ) }}
				</template>
			</fn-editor-visual-display>
		</template>
	</editor-base>
</template>

<script>
var Constants = require( '../Constants.js' ),
	EditorBase = require( './EditorBase.vue' ),
	FnEditorBase = require( '../components/editor/FnEditorBase.vue' ),
	FnEditorName = require( '../components/editor/FnEditorName.vue' ),
	FnEditorInputList = require( '../components/editor/FnEditorInputList.vue' ),
	FnEditorOutput = require( '../components/editor/FnEditorOutput.vue' ),
	FnEditorBehavior = require( '../components/editor/FnEditorBehavior.vue' ),
	FnEditorWrite = require( '../components/editor/FnEditorWrite.vue' ),
	ZImplementationList = require( '../components/function/ZImplementationList.vue' ),
	FnEditorVisualDisplay = require( '../components/editor/FnEditorVisualDisplay.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

module.exports = {
	name: 'function-editor',
	components: {
		'editor-base': EditorBase,
		'fn-editor-base': FnEditorBase,
		'fn-editor-name': FnEditorName,
		'fn-editor-input-list': FnEditorInputList,
		'fn-editor-output': FnEditorOutput,
		'fn-editor-behavior': FnEditorBehavior,
		'fn-editor-write': FnEditorWrite,
		'z-implementation-list': ZImplementationList,
		'fn-editor-visual-display': FnEditorVisualDisplay
	},
	computed: $.extend( mapGetters( [
		'getNestedZObjectById',
		'getCurrentZObjectId',
		'getZkeyLabels',
		'currentZFunctionCompletionPercentage',
		'currentZObjectHasLabel',
		'currentZFunctionHasInputs',
		'currentZFunctionHasOutput',
		'currentZFunctionHasTesters',
		'currentZFunctionHasImplementations'
	] ), {
		steps: function () {
			var steps = [
				{
					title: this.$i18n( 'wikilambda-editor-fn-step-define' ),
					completed: this.currentZObjectHasLabel &&
						this.currentZFunctionHasInputs &&
						this.currentZFunctionHasOutput,
					items: [
						{
							id: 'name',
							title: this.$i18n( 'wikilambda-editor-name-title' ),
							component: FnEditorName
						},
						{
							id: 'input',
							title: this.$i18n( 'wikilambda-editor-input-title' ),
							component: FnEditorInputList
						},
						{
							id: 'output',
							title: this.$i18n( 'wikilambda-editor-output-title' ),
							component: FnEditorOutput
						}
					]
				}
			];

			if ( this.$route.name !== 'create' ) {
				steps = steps.concat( [
					{
						title: this.$i18n( 'wikilambda-editor-fn-step-implement' ),
						completed: this.currentZFunctionHasImplementations,
						items: [
							{
								id: 'write',
								title: this.$i18n( 'wikilambda-editor-write-title' ),
								component: FnEditorWrite
							},
							{
								id: 'attach',
								title: this.$i18n( 'wikilambda-editor-attach-title' ),
								component: ZImplementationList
							}
						]
					},
					{
						title: this.$i18n( 'wikilambda-editor-fn-step-tests' ),
						completed: this.currentZFunctionHasTesters,
						items: [
							{
								id: 'behavior',
								title: this.$i18n( 'wikilambda-editor-behavior-title' ),
								component: FnEditorBehavior
							}
						]
					}
				] );
			} else {
				steps = steps.concat( [
					{
						title: this.$i18n( 'wikilambda-editor-fn-step-implement' ),
						items: []
					},
					{
						title: this.$i18n( 'wikilambda-editor-fn-step-tests' ),
						items: []
					}
				] );
			}

			return steps;
		},
		currentTab: function () {
			return this.$route.query.step;
		},
		currentStepContent: function () {
			for ( var i in this.steps ) {
				var step = this.steps[ i ];

				for ( var j in step.items ) {
					var item = step.items[ j ];

					if ( item.id === this.currentTab ) {
						return item.component || FnEditorBase;
					}
				}
			}

			return FnEditorBase;
		},
		zReturnType: function () {
			return this.getNestedZObjectById( 0, [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_RETURN_TYPE,
				Constants.Z_REFERENCE_ID
			] );
		},
		zImplementationId: function () {
			return this.getNestedZObjectById( 0, [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_IMPLEMENTATIONS
			] ).id;
		},
		computedZObjectId: function () {
			if ( this.currentTab === 'attach' ) {
				return this.zImplementationId;
			}

			return 0;
		}
	} ),
	methods: $.extend( mapActions( [
		'setAvailableZArguments',
		'fetchZKeys',
		'fetchZImplementations',
		'fetchZTesters'
	] ), {
	} ),
	mounted: function () {
		var zids = [ Constants.Z_ARGUMENT ];
		if ( this.zReturnType && this.zReturnType.value ) {
			zids.push( this.zReturnType.value );
		}
		this.fetchZKeys( zids );

		this.fetchZImplementations( this.getCurrentZObjectId );
		this.fetchZTesters( this.getCurrentZObjectId );
		this.setAvailableZArguments( this.getCurrentZObjectId );
	}
};
</script>
