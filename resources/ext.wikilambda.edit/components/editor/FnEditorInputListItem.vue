<template>
	<section class="ext-wikilambda-editor-input-list-item">
		<fn-editor-type-selector
			:type="Constants.Z_TYPE"
			:placeholder="$i18n( 'wikilambda-editor-input-type-placeholder' )"
			:selected-id="getTypeOfArgument"
			@input="setArgumentType( $event )"
		></fn-editor-type-selector>
		<!--
			TODO: This is hardcoded for now as it is the first complex input,
			In the future we should provide an UI that will allow user to define complex types
			automatically (for examplke set a function call that require x argument to be set
			and show them automatically)
		-->
		<z-object-selector
			v-if="getTypeOfArgument === Constants.Z_LIST_GENERIC"
			class="ext-wikilambda-text-input"
			:label="$i18n( 'wikilambda-editor-input-typed-list-placeholder' )"
			:placeholder="$i18n( 'wikilambda-editor-input-typed-list-placeholder' )"
			@input="setListGenericType"
			@clear="setListGenericType"
		>
		</z-object-selector>
		<input
			class="ext-wikilambda-text-input"
			:placeholder="$i18n( 'wikilambda-editor-input-label-placeholder' )"
			:aria-label="$i18n( 'wikilambda-editor-input-label-placeholder' )"
			:value="getArgumentLabel"
			@input="setArgumentLabel( zobjectId, $event.target.value )"
		>
	</section>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	FnEditorTypeSelector = require( './FnEditorTypeSelector.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	typeUtils = require( '../../mixins/typeUtils.js' );

module.exports = {
	name: 'FnEditorInputListItem',
	components: {
		'fn-editor-type-selector': FnEditorTypeSelector,
		'z-object-selector': ZObjectSelector
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			required: true
		}
	},
	computed: $.extend( mapGetters( {
		getNextObjectId: 'getNextObjectId',
		getZObjectChildrenById: 'getZObjectChildrenById',
		getNestedZObjectById: 'getNestedZObjectById',
		getCurrentZLanguage: 'getCurrentZLanguage',
		getZObjectTypeById: 'getZObjectTypeById'
	} ), {
		Constants: function () {
			return Constants;
		},
		getZArgumentType: function () {
			return this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_ARGUMENT_TYPE
			] );
		},
		getTypeOfArgument: function () {
			var zArgumentTypeId = this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_ARGUMENT_TYPE
			] ).id;

			if ( this.getZObjectTypeById( zArgumentTypeId ) === Constants.Z_REFERENCE ) {
				return this.getNestedZObjectById( zArgumentTypeId, [
					Constants.Z_REFERENCE_ID
				] ).value;
			} else if ( this.getZObjectTypeById( zArgumentTypeId ) === Constants.Z_LIST_GENERIC ) {
				return Constants.Z_LIST_GENERIC;
			}
		},
		getArgumentLabels: function () {
			return this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_ARGUMENT_LABEL,
				Constants.Z_MULTILINGUALSTRING_VALUE
			] );
		},
		getArgumentLabel: function () {
			var labels = this.getZObjectChildrenById( this.getArgumentLabels.id );

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
		}
	} ),
	methods: $.extend( mapActions( [
		'setZObjectValue',
		'addZMonolingualString',
		'changeType',
		'setTypeOfGenericType'
	] ), {
		setArgumentLabel: function ( id, input ) {
			if ( !this.getArgumentLabel ) {
				return;
			}

			var labels = this.getZObjectChildrenById( this.getArgumentLabels.id );

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
		setArgumentType: function ( type ) {
			var payload;

			if ( type === Constants.Z_LIST_GENERIC ) {
				payload = {
					id: this.getZArgumentType.id,
					type: Constants.Z_LIST_GENERIC,
					unwrapped: true
				};
			} else {
				payload = {
					id: this.getZArgumentType.id,
					type: Constants.Z_REFERENCE,
					value: type
				};
			}

			this.changeType( payload );
		},
		setListGenericType: function ( type ) {
			var payload = {
				objectId: this.getZArgumentType.id,
				type: type
			};
			this.setTypeOfGenericType( payload );
		}
	} )
};
</script>

<style lang="less">
.ext-wikilambda-editor-input-list-item {
	display: flex;
	align-items: center;

	.ext-wikilambda-text-input {
		margin-left: 10px;
	}
}
</style>
