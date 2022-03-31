<template>
	<!--
		WikiLambda Vue component for an individual input to be set for a ZFunction in the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-editor-input-list-item">
		<z-object-selector
			:type="Constants.Z_TYPE"
			class="ext-wikilambda-editor-input-list-item__selector"
			:placeholder="$i18n( 'wikilambda-function-definition-inputs-item-selector-placeholder' ).text()"
			:selected-id="getTypeOfArgument"
			:readonly="!canEditType"
			@input="setArgumentType( $event )"
		></z-object-selector>
		<!--
			TODO: This is hardcoded for now as it is the first complex input,
			In the future we should provide an UI that will allow user to define complex types
			automatically (for example set a function call that require x argument to be set
			and show them automatically)
		-->
		<z-object-selector
			v-if="getTypeOfArgument === Constants.Z_TYPED_LIST"
			class="ext-wikilambda-editor-input-list-item__selector"
			:label="$i18n( 'wikilambda-function-definition-inputs-item-typed-list-placeholder' ).text()"
			:placeholder="$i18n( 'wikilambda-function-definition-inputs-item-typed-list-placeholder' ).text()"
			@input="setListTypedList"
			@clear="setListTypedList"
		>
		</z-object-selector>

		<input
			class="ext-wikilambda-editor-input-list-item__input"
			:placeholder="$i18n( 'wikilambda-function-definition-inputs-item-input-placeholder' ).text()"
			:aria-label="$i18n( 'wikilambda-function-definition-inputs-item-input-placeholder' ).text()"
			:value="getArgumentLabel"
			@input="setArgumentLabel( zobjectId, $event.target.value )"
		>

		<template v-if="showAddNewInput">
			<div
				class="ext-wikilambda-editor-input-list-item__button ext-wikilambda-edit__text-button"
				role="button"
				@click="$emit( 'add-new-input' )">
				{{ $i18n( 'wikilambda-function-definition-inputs-item-add-input-button' ).text() }}
			</div>
		</template>
	</div>
</template>

<script>
var Constants = require( '../../../Constants.js' ),
	ZObjectSelector = require( '../../ZObjectSelector.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	typeUtils = require( '../../../mixins/typeUtils.js' );

// @vue/component
module.exports = exports = {
	name: 'fn-editor-input-list-item',
	components: {
		'z-object-selector': ZObjectSelector
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			required: true
		},
		showAddNewInput: {
			type: Boolean
		},
		canEditType: {
			type: Boolean,
			required: true
		},
		zLang: {
			type: String,
			required: true
		}
	},
	computed: $.extend( mapGetters( [
		'getNextObjectId',
		'getZObjectChildrenById',
		'getNestedZObjectById',
		'getCurrentZLanguage',
		'getZObjectTypeById'
	] ), {
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
			} else if ( this.getZObjectTypeById( zArgumentTypeId ) === Constants.Z_TYPED_LIST ) {
				return Constants.Z_TYPED_LIST;
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

				if ( lang.value === this.zLang ) {
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
		'setTypeOfTypedList'
	] ), {
		setArgumentLabel: function ( id, input ) {
			if ( !this.getArgumentLabel && !this.getArgumentLabels.id ) {
				return;
			}

			var lang = this.zLang || this.getCurrentZLanguage;

			var labels = this.getZObjectChildrenById( this.getArgumentLabels.id );

			for ( var index in labels ) {
				var labelLang = this.getNestedZObjectById( labels[ index ].id, [
						Constants.Z_MONOLINGUALSTRING_LANGUAGE,
						Constants.Z_REFERENCE_ID
					] ),
					value = this.getNestedZObjectById( labels[ index ].id, [
						Constants.Z_MONOLINGUALSTRING_VALUE,
						Constants.Z_STRING_VALUE
					] );

				if ( labelLang.value === lang ) {
					this.setZObjectValue( {
						id: value.id,
						value: input
					} );
					return;
				}
			}

			// Add new language
			var nextId = this.getNextObjectId,
				newLang = lang,
				zLabelParentId = this.getArgumentLabels.id;

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

			if ( type === Constants.Z_TYPED_LIST ) {
				payload = {
					id: this.getZArgumentType.id,
					type: Constants.Z_TYPED_LIST,
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
		setListTypedList: function ( type ) {
			var payload = {
				objectId: this.getZArgumentType.id,
				type: type
			};
			this.setTypeOfTypedList( payload );
		}
	} )
};
</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.less';

.ext-wikilambda-editor-input-list-item {
	margin-bottom: 6px;

	&__selector {
		height: 32px;
		margin-right: 6px;
	}

	&__input {
		height: 20px;
		padding: 4px 6px;
		margin-right: 8px;
	}

	&__button {
		cursor: pointer;
	}
}
</style>
