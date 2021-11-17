<template>
	<fn-editor-base>
		<template #title>
			{{ $i18n( 'wikilambda-editor-input-title' ) }}
		</template>

		<template #subtitle>
			{{ $i18n( 'wikilambda-editor-input-subtitle' ) }}
		</template>

		<fn-editor-zlanguage-selector></fn-editor-zlanguage-selector>

		<div>
			<fn-editor-input-list-item
				v-for="argument in zArgumentList"
				:key="argument.id"
				:zobject-id="argument.id"></fn-editor-input-list-item>

			<div class="description">
				{{ $i18n( 'wikilambda-editor-input-description' ) }}
			</div>

			<div>
				<sd-button @click="addNewItem">
					{{ $i18n( 'wikilambda-editor-input-add-button' ) }}
				</sd-button>
			</div>
		</div>
	</fn-editor-base>
</template>

<script>
var FnEditorBase = require( './FnEditorBase.vue' ),
	Constants = require( '../../Constants.js' ),
	FnEditorTypeSelector = require( './FnEditorTypeSelector.vue' ),
	FnEditorInputListItem = require( './FnEditorInputListItem.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	typeUtils = require( '../../mixins/typeUtils.js' ),
	FnEditorZLanguageSelector = require( './FnEditorZLanguageSelector.vue' );

module.exports = {
	name: 'FnEditorInputList',
	components: {
		'fn-editor-base': FnEditorBase,
		'fn-editor-type-selector': FnEditorTypeSelector,
		'fn-editor-zlanguage-selector': FnEditorZLanguageSelector,
		'fn-editor-input-list-item': FnEditorInputListItem
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			default: 0
		}
	},
	computed: $.extend( mapGetters( {
		getNextObjectId: 'getNextObjectId',
		getZObjectChildrenById: 'getZObjectChildrenById',
		getNestedZObjectById: 'getNestedZObjectById'
	} ), {
		Constants: function () {
			return Constants;
		},
		zFunctionId: function () {
			return this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_IDENTITY,
				Constants.Z_REFERENCE_ID
			] ).value;
		},
		zArgumentId: function () {
			return this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_ARGUMENTS
			] ).id;
		},
		zArgumentList: function () {
			return this.getZObjectChildrenById( this.zArgumentId );
		}
	} ),
	methods: $.extend( mapActions( [
		'addZObject',
		'addZArgument',
		'setAvailableZArguments'
	] ), {
		addNewItem: function ( /* event */ ) {
			var nextId = this.getNextObjectId,
				payload = {
					key: this.zArgumentList.length,
					value: 'object',
					parent: this.zArgumentId
				};
			this.addZObject( payload );

			this.addZArgument( nextId );
		}
	} ),
	watch: {
		zArgumentList: function () {
			this.setAvailableZArguments( this.zFunctionId );
		}
	},
	mounted: function () {
		this.setAvailableZArguments( this.zFunctionId );
	}
};
</script>
