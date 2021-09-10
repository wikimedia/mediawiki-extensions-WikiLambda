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
			<section
				v-for="argument in zArgumentList"
				:key="argument.id"
				class="ext-wikilambda-input-editor"
			>
				<fn-editor-type-selector
					:type="Constants.Z_TYPE"
					:placeholder="$i18n( 'wikilambda-editor-input-type-placeholder' )"
					:selected-id="getArgumentType( argument.id ).value"
					@input="setArgumentType( argument.id, $event )"
				></fn-editor-type-selector>
				<input
					class="text-input"
					:placeholder="$i18n( 'wikilambda-editor-input-label-placeholder' )"
					:aria-label="$i18n( 'wikilambda-editor-input-label-placeholder' )"
					:value="getArgumentLabel( argument.id )"
					@input="setArgumentLabel( argument.id, $event.target.value )"
				>
			</section>

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
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	typeUtils = require( '../../mixins/typeUtils.js' ),
	FnEditorZLanguageSelector = require( './FnEditorZLanguageSelector.vue' );

module.exports = {
	components: {
		'fn-editor-base': FnEditorBase,
		'fn-editor-type-selector': FnEditorTypeSelector,
		'fn-editor-zlanguage-selector': FnEditorZLanguageSelector
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			default: 0
		}
	},
	computed: $.extend( mapGetters( [
		'getNextObjectId',
		'getZObjectChildrenById',
		'getNestedZObjectById',
		'getZObjectAsJson',
		'getUserZlangZID',
		'getCurrentZLanguage'
	] ), {
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
		'setZObjectValue',
		'setAvailableZArguments',
		'addZMonolingualString'
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
		},
		getArgumentType: function ( id ) {
			return this.getNestedZObjectById( id, [
				Constants.Z_ARGUMENT_TYPE,
				Constants.Z_REFERENCE_ID
			] );
		},
		getArgumentLabels: function ( id ) {
			return this.getNestedZObjectById( id, [
				Constants.Z_ARGUMENT_LABEL,
				Constants.Z_MULTILINGUALSTRING_VALUE
			] );
		},
		getArgumentLabel: function ( id ) {
			var labels = this.getZObjectChildrenById( this.getArgumentLabels( id ).id );

			for ( var index in labels ) {
				var lang = this.getNestedZObjectById( labels[ index ].id, [
						Constants.Z_MONOLINGUALSTRING_LANGUAGE,
						Constants.Z_REFERENCE_ID
					] ),
					value = this.getNestedZObjectById( labels[ index ].id, [
						Constants.Z_MONOLINGUALSTRING_VALUE,
						Constants.Z_STRING_VALUE
					] );

				if ( lang.value === this.getCurrentZLanguage ) {
					return value.value;
				}
			}

			return null;
		},
		setArgumentLabel: function ( id, input ) {
			var labels = this.getZObjectChildrenById( this.getArgumentLabels( id ).id );

			for ( var index in labels ) {
				var lang = this.getNestedZObjectById( labels[ index ].id, [
						Constants.Z_MONOLINGUALSTRING_LANGUAGE,
						Constants.Z_REFERENCE_ID
					] ),
					value = this.getNestedZObjectById( labels[ index ].id, [
						Constants.Z_MONOLINGUALSTRING_VALUE,
						Constants.Z_STRING_VALUE
					] );

				if ( lang.value === this.getCurrentZLanguage ) {
					this.setZObjectValue( {
						id: value.id,
						value: input
					} );
					return;
				}
			}

			// Add new language
			var nextId = this.getNextObjectId,
				newLang = this.getCurrentZLanguage,
				zLabelParentId = this.getArgumentLabels( id ).id;

			this.addZMonolingualString( {
				lang: newLang,
				parentId: zLabelParentId
			} ).then( function () {
				var newMonolingualString = this.getNestedZObjectById( nextId, [
					Constants.Z_MONOLINGUALSTRING_VALUE,
					Constants.Z_STRING_VALUE
				] );

				this.setZObjectValue( {
					id: newMonolingualString.id,
					value: input
				} );
			}.bind( this ) );
		},
		setArgumentType: function ( id, type ) {
			var payload = {
				id: this.getArgumentType( id ).id,
				value: type
			};
			this.setZObjectValue( payload );
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

<style lang="less">
.ext-wikilambda-input-editor {
	display: flex;
	align-items: center;

	input.text-input {
		margin-left: 10px;
	}
}
</style>
