<template>
	<!--
		WikiLambda Vue component for setting the name of the function inside the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<fn-editor-base class="ext-wikilambda-editor-name">
		<template #title>
			{{ $i18n( 'wikilambda-editor-name-title' ) }}
		</template>

		<template #subtitle>
			{{ $i18n( 'wikilambda-editor-name-subtitle' ) }}
		</template>

		<fn-editor-zlanguage-selector></fn-editor-zlanguage-selector>

		<section>
			<h3>
				{{ $i18n( 'wikilambda-editor-name-zobject-name' ) }}
			</h3>

			<input
				v-model="zobjectLabel"
				class="ext-wikilambda-text-input"
				:aria-label="$i18n( 'wikilambda-editor-name-zobject-name' )"
				:placeholder="$i18n( 'wikilambda-editor-name-zobject-name-placeholder' )"
			>
			<div class="description">
				{{ $i18n( 'wikilambda-editor-name-zobject-name-description' ) }}
			</div>
		</section>
		<section>
			<h3>
				{{ $i18n( 'wikilambda-editor-name-aliases' ) }}
			</h3>
			<div
				v-for="alias in getCurrentLanguageAliases"
				:key="alias.id"
				class="ext-wikilambda-alias-input"
			>
				<input
					class="ext-wikilambda-text-input"
					:value="alias.value"
					aria-label="Alias"
					@input="updateAlias( alias.id, $event.target.value )"
				>
				<sd-button
					:destructive="true"
					@click="removeAlias( alias.parent )"
				>
					{{ $i18n( 'wikilambda-editor-removeitem' ) }}
				</sd-button>
			</div>
			<div class="ext-wikilambda-alias-input">
				<form @submit.prevent="addAliasForLanguage( getCurrentZLanguage )">
					<input
						v-model="newAlias"
						class="ext-wikilambda-text-input"
						aria-label="Alias"
						:placeholder="$i18n( 'wikilambda-editor-name-aliases-placeholder' )"
					>
				</form>
				<sd-button @click="addAliasForLanguage( getCurrentZLanguage )">
					+
				</sd-button>
			</div>
			<div class="description">
				{{ $i18n( 'wikilambda-editor-name-aliases-description' ) }}
			</div>
		</section>
	</fn-editor-base>
</template>

<script>
var FnEditorBase = require( './FnEditorBase.vue' ),
	Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	typeUtils = require( '../../mixins/typeUtils.js' ),
	FnEditorZLanguageSelector = require( './FnEditorZLanguageSelector.vue' ),
	SdButton = require( '../base/Button.vue' );

// @vue/component
module.exports = {
	components: {
		'fn-editor-base': FnEditorBase,
		'fn-editor-zlanguage-selector': FnEditorZLanguageSelector,
		'sd-button': SdButton
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			default: 0
		}
	},
	data: function () {
		return {
			newAlias: ''
		};
	},
	computed: $.extend( mapGetters( [
		'getZObjectChildrenById',
		'getNestedZObjectById',
		'getZkeyLabels',
		'getUserZlangZID',
		'getNextObjectId',
		'getCurrentZLanguage'
	] ), {
		zobject: function () {
			return this.getZObjectChildrenById( this.zobjectId );
		},
		getZObjectLabelId: function () {
			return this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_PERSISTENTOBJECT_LABEL,
				Constants.Z_MULTILINGUALSTRING_VALUE
			] ).id;
		},
		getZObjectLabels: function () {
			return this.getZObjectChildrenById( this.getZObjectLabelId );
		},
		zObjectAliasId: function () {
			return this.findKeyInArray( Constants.Z_PERSISTENTOBJECT_ALIASES, this.zobject ).id;
		},
		getZObjectAliases: function () {
			return this.getZObjectChildrenById(
				this.getNestedZObjectById( this.zobjectId, [
					Constants.Z_PERSISTENTOBJECT_ALIASES,
					Constants.Z_MULTILINGUALSTRINGSET_VALUE
				] ).id );
		},
		getZObjectAliasObject: function () {
			return this.getZObjectChildrenById( this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_PERSISTENTOBJECT_ALIASES,
				Constants.Z_MULTILINGUALSTRINGSET_VALUE
			] ).id ).map( function ( alias ) {
				return this.getZObjectChildrenById( alias.id );
			}.bind( this ) );
		},
		getCurrentLanguageAliases: function () {
			for ( var index in this.getZObjectAliasObject ) {
				var alias = this.getZObjectAliasObject[ index ],
					language = this.getNestedZObjectById(
						this.findKeyInArray( Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE, alias ).id, [
							Constants.Z_REFERENCE_ID
						] );

				if ( language.value === this.getCurrentZLanguage ) {
					return this.getZObjectChildrenById(
						this.findKeyInArray( Constants.Z_MONOLINGUALSTRINGSET_VALUE, alias ).id
					).map( function ( aliasString ) {
						return this.getNestedZObjectById( aliasString.id, [
							Constants.Z_STRING_VALUE
						] );
					}.bind( this ) );
				}
			}

			return false;
		},
		getZObjectLabel: function () {
			var labelObject,
				label;

			for ( var index in this.getZObjectLabels ) {
				var maybeLabel = this.getZObjectLabels[ index ],
					language = this.getNestedZObjectById( maybeLabel.id, [
						Constants.Z_MONOLINGUALSTRING_LANGUAGE,
						Constants.Z_REFERENCE_ID
					] );

				if ( language.value === this.getCurrentZLanguage ) {
					labelObject = maybeLabel;
				}
			}

			if ( labelObject ) {
				label = this.getNestedZObjectById( labelObject.id, [
					Constants.Z_MONOLINGUALSTRING_VALUE,
					Constants.Z_STRING_VALUE
				] );
			}

			return label;
		},
		zobjectLabel: {
			get: function () {
				return this.getZObjectLabel ? this.getZObjectLabel.value : '';
			},
			set: function ( value ) {
				var payload = {
					id: this.getZObjectLabel.id,
					value: value
				};
				this.setPageZObjectValue( payload );
			}
		}
	} ),
	methods: $.extend( mapActions( [
		'setZObjectValue',
		'addZObject',
		'addZString',
		'injectZObject',
		'addZMonolingualString',
		'removeZObjectChildren',
		'removeZObject',
		'setPageZObjectValue'
	] ), {
		getLanguageAliasStringsetId: function ( language ) {
			var aliasId;

			this.getZObjectAliases.forEach( function ( alias ) {
				var aliasLang = this.getNestedZObjectById( alias.id, [
					Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE,
					Constants.Z_REFERENCE_ID
				] );

				if ( aliasLang.value === language ) {
					aliasId = this.getNestedZObjectById( alias.id, [
						Constants.Z_MONOLINGUALSTRINGSET_VALUE
					] ).id;
				}
			}.bind( this ) );

			return aliasId;
		},
		getLanguageAliases: function ( language ) {
			return this.getZObjectChildrenById( this.getLanguageAliasStringsetId( language ) ).map( function ( alias ) {
				return alias.id;
			} );
		},
		addAliasForLanguage: function ( language ) {
			var existingAliasId = this.getLanguageAliasStringsetId( language ),
				nextId = this.getNextObjectId,
				payload;

			if ( existingAliasId ) {
				payload = {
					key: this.getLanguageAliases( language ).length,
					value: 'object',
					parent: existingAliasId
				};

				this.addZObject( payload );
				this.addZString( {
					id: nextId,
					value: this.newAlias
				} );
			} else {
				var key = this.getZObjectAliases.length.toString();
				payload = {
					key: key,
					value: 'object',
					parent: this.getNestedZObjectById( this.zObjectAliasId, [
						Constants.Z_MULTILINGUALSTRINGSET_VALUE
					] ).id
				};

				this.addZObject( payload );
				this.injectZObject( {
					zobject: {
						Z1K1: Constants.Z_MONOLINGUALSTRINGSET,
						Z31K1: language,
						Z31K2: [
							this.newAlias
						]
					},
					key: key,
					id: nextId,
					parent: this.getNestedZObjectById( this.zObjectAliasId, [
						Constants.Z_MULTILINGUALSTRINGSET_VALUE
					] ).id
				} );
			}

			this.newAlias = '';
		},
		updateAlias: function ( aliasId, value ) {
			var payload = {
				id: aliasId,
				value: value
			};

			this.setZObjectValue( payload );
		},
		removeAlias: function ( alias ) {
			this.removeZObjectChildren( alias );
			this.removeZObject( alias );
		}
	} )
};
</script>

<style lang="less">
.ext-wikilambda-editor-name {
	.ext-wikilambda-alias-input {
		display: flex;

		form {
			width: 100%;
		}

		&:not( :last-child ) {
			margin-bottom: 10px;
		}

		button {
			margin-left: 10px;
		}
	}
}
</style>
